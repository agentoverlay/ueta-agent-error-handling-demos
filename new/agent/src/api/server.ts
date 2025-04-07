// api/server.ts

import express from "express";
import cors from "cors";
import { v4 as uuid } from "uuid";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { config } from "../lib/config";
import { PolicyService } from "../lib/policy-service";
import { FlagPolicy, PolicyOperator, PolicyTarget } from "../lib/policy-types";
import { sellerApiRouter } from "./seller-api";

// Constants
const ACCOUNT_FILE = path.join(__dirname, "../account.json");
const STARTING_BALANCE = 1000;
const AGENT_AUDIT_FILE = path.join(__dirname, "../agent_audit.log");

// Helper for agent audit logging
function agentAuditLog(message: string) {
    const logLine = `${new Date().toISOString()} - ${message}`;
    if (config.auditableLog) {
        fs.appendFileSync(AGENT_AUDIT_FILE, logLine + "\n");
    }
    if (config.monitoringEnabled) {
        console.log(`[AGENT MONITOR] ${logLine}`);
    }
}

// Setup Express API server
const app = express();
app.use(cors());
app.use(express.json());

// Register the seller API router
app.use("/api/seller", sellerApiRouter);

// Set up routes
app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

// Get account info
app.get("/api/account", (req, res) => {
    try {
        if (!fs.existsSync(ACCOUNT_FILE)) {
            return res.status(404).json({ error: "Account not found. Create an account first." });
        }

        const accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
        const account = JSON.parse(accountData);
        return res.json(account);
    } catch (error) {
        return res.status(500).json({ error: `Error getting account: ${error}` });
    }
});

// Create account
app.post("/api/account", (req, res) => {
    try {
        const { deposit = 100 } = req.body;
        
        if (deposit > STARTING_BALANCE) {
            agentAuditLog(`Failed to create account: deposit ${deposit} exceeds starting balance.`);
            return res.status(400).json({ 
                error: `Deposit amount ${deposit} exceeds starting balance of ${STARTING_BALANCE}.` 
            });
        }
        
        const account = {
            id: uuid(),
            wallet: STARTING_BALANCE - deposit,
        };
        
        fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2));
        agentAuditLog(`Account created: ${JSON.stringify(account)}`);
        
        return res.json({
            message: "Account created successfully",
            account
        });
    } catch (error) {
        return res.status(500).json({ error: `Error creating account: ${error}` });
    }
});

// Get products
app.get("/api/products", async (req, res) => {
    try {
        const response = await fetch(`${config.sellerUrl}/products`);
        if (!response.ok) {
            agentAuditLog("Error fetching products from business API.");
            return res.status(response.status).json({ error: "Error fetching products." });
        }
        
        const products = await response.json();
        return res.json(products);
    } catch (error) {
        agentAuditLog(`Error connecting to business API: ${error}`);
        return res.status(500).json({ error: `Error connecting to business API: ${error}` });
    }
});

// Get pending orders
app.get("/api/orders/pending", async (req, res) => {
    try {
        if (!fs.existsSync(ACCOUNT_FILE)) {
            return res.status(404).json({ error: "Account not found. Create an account first." });
        }

        const accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
        const account = JSON.parse(accountData);
        
        // First, get locally stored pending orders
        const orderMetaFile = path.join(__dirname, '../data/order_meta.json');
        let localPendingOrders = [];
        
        try {
            if (fs.existsSync(orderMetaFile)) {
                const data = fs.readFileSync(orderMetaFile, 'utf8');
                const orderMeta = JSON.parse(data);
                
                // Get all orders that are pending and match this account
                localPendingOrders = Object.values(orderMeta)
                    .filter((order: any) => 
                        order.status === "pending_confirmation" && 
                        order.accountId === account.id
                    );
            }
        } catch (err) {
            console.error('Error loading order metadata:', err);
        }
        
        // Then, get orders from the seller that are pending
        const response = await fetch(`${config.sellerUrl}/pending`);
        let sellerPendingOrders = [];
        
        if (response.ok) {
            const pendingOrders = await response.json();
            // Filter orders for this agent's account
            sellerPendingOrders = pendingOrders.filter(
                (order: any) => order.accountId === account.id
            );
            
            // Add policy trigger metadata to orders from seller
            sellerPendingOrders = sellerPendingOrders.map((order: any) => {
                const meta = {};
                return {
                    ...order,
                    policyTriggered: false, // these went through agent approval already
                    policyReasons: [],
                    source: "seller"
                };
            });
        }
        
        // Combine both lists of pending orders
        const allPendingOrders = [
            ...localPendingOrders.map((order: any) => ({...order, source: "agent"})),
            ...sellerPendingOrders
        ];
        
        return res.json(allPendingOrders);
    } catch (error) {
        return res.status(500).json({ error: `Error fetching pending orders: ${error}` });
    }
});

// Get policies
app.get("/api/policies", (req, res) => {
    try {
        const policies = PolicyService.loadPolicies();
        return res.json(policies);
    } catch (error) {
        return res.status(500).json({ error: `Error getting policies: ${error}` });
    }
});

// Get a specific policy
app.get("/api/policies/:id", (req, res) => {
    try {
        const { id } = req.params;
        const policies = PolicyService.loadPolicies();
        const policy = policies.find(p => p.id === id);
        
        if (!policy) {
            return res.status(404).json({ error: "Policy not found" });
        }
        
        return res.json(policy);
    } catch (error) {
        return res.status(500).json({ error: `Error getting policy: ${error}` });
    }
});

// Create a new policy
app.post("/api/policies", (req, res) => {
    try {
        const { name, description, target, operator, value, enabled } = req.body;
        
        if (!name || !target || !operator || value === undefined) {
            return res.status(400).json({ error: "Required fields missing" });
        }
        
        // Validate target
        if (!Object.values(PolicyTarget).includes(target as PolicyTarget)) {
            return res.status(400).json({ error: `Invalid target. Must be one of: ${Object.values(PolicyTarget).join(', ')}` });
        }
        
        // Validate operator
        if (!Object.values(PolicyOperator).includes(operator as PolicyOperator)) {
            return res.status(400).json({ error: `Invalid operator. Must be one of: ${Object.values(PolicyOperator).join(', ')}` });
        }
        
        const policy = PolicyService.addPolicy({
            name,
            description,
            target: target as PolicyTarget,
            operator: operator as PolicyOperator,
            value,
            enabled: enabled !== undefined ? enabled : true
        });
        
        return res.status(201).json(policy);
    } catch (error) {
        return res.status(500).json({ error: `Error creating policy: ${error}` });
    }
});

// Update a policy
app.put("/api/policies/:id", (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, target, operator, value, enabled } = req.body;
        
        // Validate target if provided
        if (target && !Object.values(PolicyTarget).includes(target as PolicyTarget)) {
            return res.status(400).json({ error: `Invalid target. Must be one of: ${Object.values(PolicyTarget).join(', ')}` });
        }
        
        // Validate operator if provided
        if (operator && !Object.values(PolicyOperator).includes(operator as PolicyOperator)) {
            return res.status(400).json({ error: `Invalid operator. Must be one of: ${Object.values(PolicyOperator).join(', ')}` });
        }
        
        const updatedPolicy = PolicyService.updatePolicy(id, {
            name,
            description,
            target: target as PolicyTarget,
            operator: operator as PolicyOperator,
            value,
            enabled
        });
        
        if (!updatedPolicy) {
            return res.status(404).json({ error: "Policy not found" });
        }
        
        return res.json(updatedPolicy);
    } catch (error) {
        return res.status(500).json({ error: `Error updating policy: ${error}` });
    }
});

// Delete a policy
app.delete("/api/policies/:id", (req, res) => {
    try {
        const { id } = req.params;
        const success = PolicyService.deletePolicy(id);
        
        if (!success) {
            return res.status(404).json({ error: "Policy not found" });
        }
        
        return res.json({ message: "Policy deleted successfully" });
    } catch (error) {
        return res.status(500).json({ error: `Error deleting policy: ${error}` });
    }
});

// Check if an order would require approval
app.post("/api/policies/check", (req, res) => {
    try {
        const { sku, quantity, totalPrice, walletBalance, isAgentTransaction } = req.body;
        
        if (!sku || !quantity || totalPrice === undefined || walletBalance === undefined) {
            return res.status(400).json({ error: "Required fields missing" });
        }
        
        const result = PolicyService.checkPolicies({
            sku,
            quantity,
            totalPrice,
            walletBalance,
            isAgentTransaction
        });
        
        return res.json(result);
    } catch (error) {
        return res.status(500).json({ error: `Error checking policies: ${error}` });
    }
});

// Get transaction logs
app.get("/api/logs", (req, res) => {
    try {
        if (!fs.existsSync(AGENT_AUDIT_FILE)) {
            return res.json([]);
        }
        
        const logContent = fs.readFileSync(AGENT_AUDIT_FILE, "utf-8");
        const logLines = logContent.split("\n").filter(line => line.trim() !== "");
        
        const logs = logLines.map(line => {
            const timestampMatch = line.match(/^([\d\-T:.Z]+) - (.+)$/);
            if (timestampMatch) {
                return {
                    timestamp: timestampMatch[1],
                    message: timestampMatch[2]
                };
            }
            return { timestamp: "", message: line };
        });
        
        return res.json(logs);
    } catch (error) {
        return res.status(500).json({ error: `Error reading transaction logs: ${error}` });
    }
});

// Handle adding funds to wallet
app.post("/api/ueta-add-funds", (req, res) => {
    try {
        const { amount } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: "Please provide a valid amount greater than 0." });
        }
        
        if (!fs.existsSync(ACCOUNT_FILE)) {
            return res.status(404).json({ error: "Account not found. Create an account first." });
        }
        
        const accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
        const account = JSON.parse(accountData);
        
        // Update wallet balance
        account.wallet += amount;
        fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2));
        
        agentAuditLog(`Added funds to wallet: ${amount.toFixed(2)}. New balance: ${account.wallet.toFixed(2)}`);
        
        return res.json({
            message: "Funds added successfully",
            newBalance: account.wallet
        });
    } catch (error) {
        return res.status(500).json({ error: `Error adding funds: ${error}` });
    }
});

// Handle withdrawing funds from wallet
app.post("/api/ueta-withdraw-funds", (req, res) => {
    try {
        const { amount } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: "Please provide a valid amount greater than 0." });
        }
        
        if (!fs.existsSync(ACCOUNT_FILE)) {
            return res.status(404).json({ error: "Account not found. Create an account first." });
        }
        
        const accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
        const account = JSON.parse(accountData);
        
        // Check if user has enough funds
        if (account.wallet < amount) {
            return res.status(400).json({ 
                error: `Insufficient funds. Current balance: ${account.wallet.toFixed(2)}` 
            });
        }
        
        // Update wallet balance
        account.wallet -= amount;
        fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2));
        
        agentAuditLog(`Withdrew funds from wallet: ${amount.toFixed(2)}. New balance: ${account.wallet.toFixed(2)}`);
        
        return res.json({
            message: "Funds withdrawn successfully",
            newBalance: account.wallet
        });
    } catch (error) {
        return res.status(500).json({ error: `Error withdrawing funds: ${error}` });
    }
});

// Place order
app.post("/api/order", async (req, res) => {
    try {
        const { sku, quantity, agentMode = false, simulateError = false } = req.body;
        
        if (!sku || !quantity) {
            return res.status(400).json({ error: "SKU and quantity are required." });
        }
        
        if (!fs.existsSync(ACCOUNT_FILE)) {
            agentAuditLog("Order failed: No account found.");
            return res.status(404).json({ 
                error: "No account found. Create an account first." 
            });
        }
        
        const accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
        const account = JSON.parse(accountData);
        
        // Fetch product details
        const productRes = await fetch(`${config.sellerUrl}/products`);
        if (!productRes.ok) {
            agentAuditLog("Error fetching products for order.");
            return res.status(productRes.status).json({ 
                error: "Error fetching products." 
            });
        }
        
        const products = await productRes.json();
        console.log('[API] Available products:', products);
        
        // Print enabled policies for debugging
        const enabledPolicies = PolicyService.loadPolicies().filter(p => p.enabled);
        console.log('[API] Enabled policies:', enabledPolicies);
        
        const product = products.find((p: any) => p.sku === sku);
        
        if (!product) {
            agentAuditLog(`Order failed: Product not found for SKU ${sku}`);
            return res.status(404).json({
                error: `Product not found for SKU: ${sku}`
            });
        }
        
        // Apply error simulation if enabled (multiply quantity by 10)
        const actualQuantity = simulateError ? quantity * 10 : quantity;
        
        if (simulateError) {
            agentAuditLog(`Error simulation active: Multiplying quantity from ${quantity} to ${actualQuantity}`);
            console.log(`[API] Error simulation active! Multiplying quantity from ${quantity} to ${actualQuantity}`);
        }
        
        const totalCost = product.price * actualQuantity;
        if (account.wallet < totalCost) {
            agentAuditLog(`Order failed: Insufficient funds. Wallet: ${account.wallet}, needed: ${totalCost}`);
            return res.status(400).json({
                error: `Insufficient funds in wallet. Wallet: ${account.wallet}, Order cost: ${totalCost}`
            });
        }

        // Check if order requires approval based on policies
        const policyResult = PolicyService.checkPolicies({
            sku,
            quantity: actualQuantity,
            totalPrice: totalCost,
            walletBalance: account.wallet - totalCost, // Balance after order
            isAgentTransaction: agentMode // Pass the agent mode flag to policy checks
        });

        // Create payload for the order
        const payload = {
            accountId: account.id,
            sku,
            quantity: actualQuantity, // Use the potentially multiplied quantity
            agent: agentMode,
        };

        // Log policy evaluation
        console.log(`[API] Policy check result: requires approval = ${policyResult.requiresApproval}`);
        console.log(`[API] Order payload to seller:`, payload);
        
        // Check if any policy was triggered requiring approval
        if (policyResult.requiresApproval) {
            const triggerReasons = policyResult.evaluations
                .filter(e => e.triggered)
                .map(e => e.reason)
                .join('; ');
            agentAuditLog(`Order requires approval due to policies: ${triggerReasons}`);
            
            // Store the order locally with a pending_approval status
            const pendingOrder = {
                id: uuid(),
                accountId: account.id,
                sku,
                quantity: actualQuantity,
                totalPrice: totalCost,
                orderDate: new Date(),
                status: "pending_confirmation",
                agentMode: agentMode,
                policyTriggered: true,
                policyReasons: policyResult.evaluations
                    .filter(e => e.triggered)
                    .map(e => e.policyName)
            };
            
            // Store order metadata
            try {
                const orderMetaFile = path.join(__dirname, '../data/order_meta.json');
                let orderMeta = {};
                
                if (fs.existsSync(orderMetaFile)) {
                    const data = fs.readFileSync(orderMetaFile, 'utf8');
                    orderMeta = JSON.parse(data);
                }
                
                // Store the entire pending order in the metadata
                orderMeta[pendingOrder.id] = pendingOrder;
                
                fs.writeFileSync(orderMetaFile, JSON.stringify(orderMeta, null, 2));
                agentAuditLog(`Stored pending order awaiting approval: ${pendingOrder.id}`);
            } catch (err) {
                console.error('Error storing order metadata:', err);
            }
            
            // Update wallet balance even though order hasn't been sent yet
            account.wallet -= totalCost;
            fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2));
            agentAuditLog(`Updated wallet balance: ${account.wallet}`);
            
            return res.json({
                message: "Order requires approval before sending to seller",
                order: pendingOrder,
                walletBalance: account.wallet,
                requiresApproval: true,
                policyEvaluations: policyResult.evaluations.filter(e => e.triggered)
            });
        }
        
        // If no policies were triggered, send order directly to seller
        
        const orderResponse = await fetch(`${config.sellerUrl}/order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        
        if (!orderResponse.ok) {
            const errorData = await orderResponse.json();
            agentAuditLog(`Order error: ${JSON.stringify(errorData)}`);
            return res.status(orderResponse.status).json(errorData);
        }
        
        const order = await orderResponse.json();
        
        // Mark if this order required approval due to policies
        const orderId = order.id || 'unknown';
        agentAuditLog(`Order placed: ${JSON.stringify(order)}, policy triggered: ${policyResult.requiresApproval}`);
        
        // Store metadata about this order in a side file to track policy triggers
        try {
            const orderMetaFile = path.join(__dirname, '../data/order_meta.json');
            let orderMeta = {};
            
            if (fs.existsSync(orderMetaFile)) {
                const data = fs.readFileSync(orderMetaFile, 'utf8');
                orderMeta = JSON.parse(data);
            }
            
            // Store whether this order triggered policies
            orderMeta[orderId] = {
                policyTriggered: policyResult.requiresApproval,
                policies: policyResult.requiresApproval ? 
                    policyResult.evaluations.filter(e => e.triggered).map(e => e.policyName) : 
                    []
            };
            
            fs.writeFileSync(orderMetaFile, JSON.stringify(orderMeta, null, 2));
        } catch (err) {
            console.error('Error storing order metadata:', err);
        }
        
        // Update wallet balance
        account.wallet -= totalCost;
        fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2));
        agentAuditLog(`Updated wallet balance: ${account.wallet}`);
        
        return res.json({
            message: "Order placed successfully",
            order,
            walletBalance: account.wallet,
            requiresApproval: policyResult.requiresApproval,
            policyEvaluations: policyResult.requiresApproval ? policyResult.evaluations : undefined
        });
    } catch (error) {
        agentAuditLog(`Error connecting to business API while placing order: ${error}`);
        return res.status(500).json({ 
            error: `Error placing order: ${error}` 
        });
    }
});

// Approve order
app.post("/api/order/approve", async (req, res) => {
    try {
        const { orderId } = req.body;
        
        if (!orderId) {
            return res.status(400).json({ error: "OrderID is required." });
        }
        
        // First, check if this is a local pending order that needs to be sent to seller
        const orderMetaFile = path.join(__dirname, '../data/order_meta.json');
        let localOrder = null;
        let orderMeta = {};
        
        try {
            if (fs.existsSync(orderMetaFile)) {
                const data = fs.readFileSync(orderMetaFile, 'utf8');
                orderMeta = JSON.parse(data);
                
                if (orderMeta[orderId]) {
                    localOrder = orderMeta[orderId];
                }
            }
        } catch (err) {
            console.error('Error loading order metadata:', err);
        }
        
        // If this is a local order awaiting approval, send it to the seller
        if (localOrder && localOrder.status === "pending_confirmation") {
            // Create payload for the seller
            const payload = {
                accountId: localOrder.accountId,
                sku: localOrder.sku,
                quantity: localOrder.quantity,
                agent: localOrder.agentMode || false,
            };
            
            // Send to seller
            const orderResponse = await fetch(`${config.sellerUrl}/order`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            
            if (!orderResponse.ok) {
                const errorData = await orderResponse.json();
                agentAuditLog(`Error sending approved order to seller: ${JSON.stringify(errorData)}`);
                return res.status(orderResponse.status).json(errorData);
            }
            
            const sellerOrder = await orderResponse.json();
            
            // Mark local order as sent to seller
            localOrder.status = "sent_to_seller";
            localOrder.sellerOrderId = sellerOrder.id;
            orderMeta[orderId] = localOrder;
            
            console.log(`Order approved and sent to seller: ${orderId} -> ${sellerOrder.id}. Updated wallet balance: ${account.wallet}`);
            
            // Update the metadata file
            fs.writeFileSync(orderMetaFile, JSON.stringify(orderMeta, null, 2));
            
            agentAuditLog(`Approved and sent order to seller: ${orderId} -> ${sellerOrder.id}`);
            
            return res.json({
                message: "Order approved and sent to seller",
                order: sellerOrder
            });
        }
        
        // If it's not a local order, it must be a seller order needing approval
        const response = await fetch(`${config.sellerUrl}/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json(errorData);
        }
        
        const result = await response.json();
        agentAuditLog(`Order approved at seller: ${orderId}`);
        
        return res.json({
            message: "Order approved successfully",
            order: result.order
        });
    } catch (error) {
        return res.status(500).json({ 
            error: `Error approving order: ${error}` 
        });
    }
});

// Start autonomous agent
app.post("/api/agent/start", async (req, res) => {
    try {
        if (!fs.existsSync(ACCOUNT_FILE)) {
            agentAuditLog("Agent failed to start: No account found.");
            return res.status(404).json({ 
                error: "No account found. Create an account first." 
            });
        }
        
        const accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
        const account = JSON.parse(accountData);
        
        agentAuditLog(`Agent mode started for account: ${account.id}`);
        
        // Start the agent in a background process
        startAutonomousAgent();
        
        return res.json({
            message: `Autonomous agent mode started for account: ${account.id}`,
            accountId: account.id
        });
    } catch (error) {
        return res.status(500).json({ 
            error: `Error starting autonomous agent: ${error}` 
        });
    }
});

// Helper function to run the autonomous agent
let agentRunning = false;
let stopAgent = false;

async function startAutonomousAgent() {
    if (agentRunning) return; // Prevent multiple agent instances
    
    agentRunning = true;
    stopAgent = false;
    
    const agentProcess = async () => {
        while (!stopAgent) {
            await new Promise(res => setTimeout(res, Math.floor(Math.random() * 5000) + 1000));
            
            try {
                // Skip iteration if agent should stop
                if (stopAgent) break;
                
                // Read latest account info to get current balance
                if (!fs.existsSync(ACCOUNT_FILE)) {
                    agentAuditLog("Agent error: Account file not found.");
                    stopAgent = true;
                    break;
                }
                
                const accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
                const currentAccount = JSON.parse(accountData);
                
                // Fetch products
                const res = await fetch(`${config.sellerUrl}/products`);
                if (!res.ok) {
                    agentAuditLog("Agent error: Failed to fetch products.");
                    continue;
                }
                
                const products = await res.json();
                if (!products || products.length === 0) {
                    agentAuditLog("Agent error: No products available.");
                    continue;
                }
                
                // Select random product and quantity
                const product = products[Math.floor(Math.random() * products.length)];
                const quantity = Math.floor(Math.random() * 5) + 1;
                const totalCost = product.price * quantity;
                
                if (currentAccount.wallet < totalCost) {
                    agentAuditLog(`Agent skipped order due to insufficient funds. Wallet: ${currentAccount.wallet}, needed: ${totalCost}`);
                    continue;
                }
                
                // Place the order
                const payload = {
                    accountId: currentAccount.id,
                    sku: product.sku,
                    quantity,
                    agent: true,
                };
                
                const response = await fetch(`${config.sellerUrl}/order`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    agentAuditLog(`Agent order error: ${JSON.stringify(errorData)}`);
                } else {
                    const order = await response.json();
                    agentAuditLog(`Agent order placed: ${JSON.stringify(order)}`);
                    
                    // Update wallet balance
                    currentAccount.wallet -= totalCost;
                    fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(currentAccount, null, 2));
                    agentAuditLog(`Agent updated wallet balance: ${currentAccount.wallet}`);
                }
            } catch (error) {
                agentAuditLog(`Agent error: ${error}`);
            }
        }
        
        agentRunning = false;
        agentAuditLog("Autonomous agent stopped.");
    };
    
    agentProcess().catch(err => {
        agentAuditLog(`Autonomous agent error: ${err}`);
        agentRunning = false;
    });
}

// Stop autonomous agent
app.post("/api/agent/stop", (req, res) => {
    if (!agentRunning) {
        return res.status(400).json({ error: "Agent is not running." });
    }
    
    stopAgent = true;
    agentAuditLog("Agent stop requested.");
    
    return res.json({
        message: "Agent stop requested."
    });
});

// Get agent status
app.get("/api/agent/status", (req, res) => {
    return res.json({
        running: agentRunning
    });
});

// Get stats
app.get("/api/stats", async (req, res) => {
    try {
        const statsResponse = await fetch(`${config.sellerUrl}/stats`);
        if (!statsResponse.ok) {
            return res.status(statsResponse.status).json({ 
                error: "Error fetching stats." 
            });
        }
        
        const stats = await statsResponse.json();
        return res.json(stats);
    } catch (error) {
        return res.status(500).json({ 
            error: `Error fetching stats: ${error}` 
        });
    }
});

// MCP Server setup
const mcpServer = new McpServer({
    name: "UETA Agent Server",
    version: "1.0.0"
});

// MCP Resource: Get account info
mcpServer.resource(
    "account",
    "account://info",
    async (uri) => {
        if (!fs.existsSync(ACCOUNT_FILE)) {
            return {
                contents: [{
                    uri: uri.href,
                    text: "No account found. Create an account first using the 'create-account' tool."
                }]
            };
        }
        
        const accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
        const account = JSON.parse(accountData);
        
        return {
            contents: [{
                uri: uri.href,
                text: JSON.stringify(account, null, 2)
            }]
        };
    }
);

// MCP Resource: Get available products
mcpServer.resource(
    "products",
    "products://list",
    async (uri) => {
        try {
            const response = await fetch(`${config.sellerUrl}/products`);
            if (!response.ok) {
                agentAuditLog("Error fetching products from business API.");
                return {
                    contents: [{
                        uri: uri.href,
                        text: "Error fetching products from business API."
                    }]
                };
            }
            
            const products = await response.json();
            return {
                contents: [{
                    uri: uri.href,
                    text: JSON.stringify(products, null, 2)
                }]
            };
        } catch (error) {
            agentAuditLog(`Error connecting to business API: ${error}`);
            return {
                contents: [{
                    uri: uri.href,
                    text: `Error connecting to business API: ${error}`
                }]
            };
        }
    }
);

// MCP Resource: Get pending orders
mcpServer.resource(
    "pending",
    "pending://orders",
    async (uri) => {
        try {
            if (!fs.existsSync(ACCOUNT_FILE)) {
                return {
                    contents: [{
                        uri: uri.href,
                        text: "No account found. Create an account first using the 'create-account' tool."
                    }]
                };
            }
            
            const accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
            const account = JSON.parse(accountData);
            
            const response = await fetch(`${config.sellerUrl}/pending`);
            if (!response.ok) {
                return {
                    contents: [{
                        uri: uri.href,
                        text: "Error fetching pending orders from business API."
                    }]
                };
            }
            
            const pendingOrders = await response.json();
            const myPending = pendingOrders.filter(
                (order: any) => order.accountId === account.id
            );
            
            return {
                contents: [{
                    uri: uri.href,
                    text: JSON.stringify(myPending, null, 2)
                }]
            };
        } catch (error) {
            return {
                contents: [{
                    uri: uri.href,
                    text: `Error connecting to business API: ${error}`
                }]
            };
        }
    }
);

// MCP Resource: Get agent status
mcpServer.resource(
    "agent",
    "agent://status",
    async (uri) => {
        if (!fs.existsSync(ACCOUNT_FILE)) {
            return {
                contents: [{
                    uri: uri.href,
                    text: "No account found. Create an account first using the 'create-account' tool."
                }]
            };
        }
        
        const accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
        const account = JSON.parse(accountData);
        
        return {
            contents: [{
                uri: uri.href,
                text: JSON.stringify({
                    accountId: account.id,
                    walletBalance: account.wallet,
                    auditLogEnabled: config.auditableLog,
                    monitoringEnabled: config.monitoringEnabled,
                    agentRunning
                }, null, 2)
            }]
        };
    }
);

// MCP Tool: Create a new account
mcpServer.tool(
    "create-account",
    { deposit: z.number().default(100) },
    async ({ deposit }) => {
        if (deposit > STARTING_BALANCE) {
            agentAuditLog(`Failed to create account: deposit ${deposit} exceeds starting balance.`);
            return {
                content: [{ 
                    type: "text", 
                    text: `Deposit amount ${deposit} exceeds starting balance of ${STARTING_BALANCE}.` 
                }],
                isError: true
            };
        }
        
        const account = {
            id: uuid(),
            wallet: STARTING_BALANCE - deposit,
        };
        
        fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2));
        agentAuditLog(`Account created: ${JSON.stringify(account)}`);
        
        return {
            content: [{ 
                type: "text", 
                text: `Account created successfully. ID: ${account.id}, Wallet Balance: ${account.wallet}` 
            }]
        };
    }
);

// MCP Tool: Place an order
mcpServer.tool(
    "place-order",
    {
        sku: z.string(),
        quantity: z.number().int().positive(),
        agentMode: z.boolean().default(false)
    },
    async ({ sku, quantity, agentMode }) => {
        if (!fs.existsSync(ACCOUNT_FILE)) {
            agentAuditLog("Order failed: No account found.");
            return {
                content: [{ 
                    type: "text", 
                    text: "No account found. Create an account first using the 'create-account' tool." 
                }],
                isError: true
            };
        }
        
        const accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
        const account = JSON.parse(accountData);
        
        try {
            // Fetch product details
            const res = await fetch(`${config.sellerUrl}/products`);
            if (!res.ok) {
                agentAuditLog("Error fetching products for order.");
                return {
                    content: [{ 
                        type: "text", 
                        text: "Error fetching products from business API." 
                    }],
                    isError: true
                };
            }
            
            const products = await res.json();
            const product = products.find((p: any) => p.sku === sku);
            
            if (!product) {
                agentAuditLog(`Order failed: Product not found for SKU ${sku}`);
                return {
                    content: [{ 
                        type: "text", 
                        text: `Product not found for SKU: ${sku}` 
                    }],
                    isError: true
                };
            }
            
            const totalCost = product.price * quantity;
            if (account.wallet < totalCost) {
                agentAuditLog(`Order failed: Insufficient funds. Wallet: ${account.wallet}, needed: ${totalCost}`);
                return {
                    content: [{ 
                        type: "text", 
                        text: `Insufficient funds in wallet. Wallet: ${account.wallet}, Order cost: ${totalCost}` 
                    }],
                    isError: true
                };
            }
            
            const payload = {
                accountId: account.id,
                sku: sku,
                quantity: quantity,
                agent: agentMode,
            };
            
            const response = await fetch(`${config.sellerUrl}/order`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                agentAuditLog(`Order error: ${JSON.stringify(errorData)}`);
                return {
                    content: [{ 
                        type: "text", 
                        text: `Error placing order: ${JSON.stringify(errorData)}` 
                    }],
                    isError: true
                };
            }
            
            const order = await response.json();
            agentAuditLog(`Order placed: ${JSON.stringify(order)}`);
            
            // Update wallet balance
            account.wallet -= totalCost;
            fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2));
            agentAuditLog(`Updated wallet balance: ${account.wallet}`);
            
            return {
                content: [{ 
                    type: "text", 
                    text: `Order placed successfully. Order details: ${JSON.stringify(order)}\nUpdated wallet balance: ${account.wallet}` 
                }]
            };
        } catch (error) {
            agentAuditLog(`Error connecting to business API while placing order: ${error}`);
            return {
                content: [{ 
                    type: "text", 
                    text: `Error connecting to business API: ${error}` 
                }],
                isError: true
            };
        }
    }
);

// MCP Tool: Approve order
mcpServer.tool(
    "approve-order",
    { orderId: z.string() },
    async ({ orderId }) => {
        try {
            const response = await fetch(`${config.sellerUrl}/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                return {
                    content: [{ 
                        type: "text", 
                        text: `Error approving order: ${JSON.stringify(errorData)}` 
                    }],
                    isError: true
                };
            }
            
            const result = await response.json();
            agentAuditLog(`Order approved: ${orderId}`);
            
            return {
                content: [{ 
                    type: "text", 
                    text: `Order ${orderId} approved successfully.` 
                }]
            };
        } catch (error) {
            return {
                content: [{ 
                    type: "text", 
                    text: `Error connecting to business API: ${error}` 
                }],
                isError: true
            };
        }
    }
);

// MCP Tool: Start autonomous agent
mcpServer.tool(
    "start-autonomous-agent",
    {},
    async () => {
        if (!fs.existsSync(ACCOUNT_FILE)) {
            agentAuditLog("Agent failed to start: No account found.");
            return {
                content: [{ 
                    type: "text", 
                    text: "No account found. Create an account first using the 'create-account' tool." 
                }],
                isError: true
            };
        }
        
        const accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
        const account = JSON.parse(accountData);
        
        agentAuditLog(`Agent mode started for account: ${account.id}`);
        
        // Start the agent in a background process
        startAutonomousAgent();
        
        return {
            content: [{ 
                type: "text", 
                text: `Autonomous agent mode started for account: ${account.id}. The agent will place random orders in the background.` 
            }]
        };
    }
);

// MCP Tool: Stop autonomous agent
mcpServer.tool(
    "stop-autonomous-agent",
    {},
    async () => {
        if (!agentRunning) {
            return {
                content: [{ 
                    type: "text", 
                    text: "Agent is not running." 
                }],
                isError: true
            };
        }
        
        stopAgent = true;
        agentAuditLog("Agent stop requested.");
        
        return {
            content: [{ 
                type: "text", 
                text: "Agent stop requested. The agent will stop after completing any in-progress operations." 
            }]
        };
    }
);

// Start the MCP server
let mcpServerStarted = false;

async function startMcpServer() {
    if (!mcpServerStarted) {
        console.log("Starting MCP server...");
        const transport = new StdioServerTransport();
        await mcpServer.connect(transport);
        mcpServerStarted = true;
    }
}

// Start the Express API server
import { env } from '../lib/env';
const PORT = env.API_PORT;

app.listen(PORT, () => {
    console.log(`Agent API server running on port ${PORT}`);
    console.log(`API available at ${env.NEXT_PUBLIC_API_URL}/api`);
    
    // Start the MCP server if not already started
    startMcpServer().catch(err => {
        console.error("Error starting MCP server:", err);
    });
});
