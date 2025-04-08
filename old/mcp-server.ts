#!/usr/bin/env ts-node

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import { mcpServerConfig } from "./mcp-server-config";

// Constants
const ACCOUNT_FILE = path.join(__dirname, "account.json");
const STARTING_BALANCE = 1000;
const AGENT_AUDIT_FILE = path.join(__dirname, "agent_audit.log");

// Helper for agent audit logging.
function agentAuditLog(message: string) {
    const logLine = `${new Date().toISOString()} - ${message}`;
    if (mcpServerConfig.auditableLog) {
        fs.appendFileSync(AGENT_AUDIT_FILE, logLine + "\n");
    }
    if (mcpServerConfig.monitoringEnabled) {
        console.log(`[AGENT MONITOR] ${logLine}`);
    }
}

// Type definitions
interface Account {
    id: string;
    wallet: number;
}

interface Product {
    sku: string;
    description: string;
    price: number;
}

interface Order {
    id: string;
    accountId: string;
    sku: string;
    quantity: number;
    totalPrice: number;
    status: string;
    agent: boolean;
}

// Helper functions
function getAccount(): Account | null {
    if (!fs.existsSync(ACCOUNT_FILE)) {
        return null;
    }
    const data = fs.readFileSync(ACCOUNT_FILE, "utf-8");
    return JSON.parse(data);
}

function saveAccount(account: Account): void {
    fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2));
}

// Create the MCP server
const server = new McpServer({
    name: "UETA Agent Server",
    version: "1.0.0"
});

// Resource: Get account info
server.resource(
    "account",
    "account://info",
    async (uri) => {
        const account = getAccount();
        if (!account) {
            return {
                contents: [{
                    uri: uri.href,
                    text: "No account found. Create an account first using the 'create-account' tool."
                }]
            };
        }
        return {
            contents: [{
                uri: uri.href,
                text: JSON.stringify(account, null, 2)
            }]
        };
    }
);

// Resource: Get available products
server.resource(
    "products",
    "products://list",
    async (uri) => {
        try {
            const response = await fetch(`${mcpServerConfig.sellerUrl}/products`);
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

// Resource: Get pending orders
server.resource(
    "pending",
    "pending://orders",
    async (uri) => {
        try {
            const account = getAccount();
            if (!account) {
                return {
                    contents: [{
                        uri: uri.href,
                        text: "No account found. Create an account first using the 'create-account' tool."
                    }]
                };
            }
            
            const response = await fetch(`${mcpServerConfig.sellerUrl}/pending`);
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

// Resource: Get overall stats
server.resource(
    "stats",
    "stats://overall",
    async (uri) => {
        try {
            const statsResponse = await fetch(`${mcpServerConfig.sellerUrl}/stats`);
            const stats = statsResponse.ok
                ? await statsResponse.json()
                : { totalOrders: 0, totalAmountPaid: 0 };
                
            return {
                contents: [{
                    uri: uri.href,
                    text: JSON.stringify(stats, null, 2)
                }]
            };
        } catch (error) {
            return {
                contents: [{
                    uri: uri.href,
                    text: `Error fetching stats: ${error}`
                }]
            };
        }
    }
);

// Resource: Get agent status
server.resource(
    "agent",
    "agent://status",
    async (uri) => {
        const account = getAccount();
        if (!account) {
            return {
                contents: [{
                    uri: uri.href,
                    text: "No account found. Create an account first using the 'create-account' tool."
                }]
            };
        }
        
        return {
            contents: [{
                uri: uri.href,
                text: JSON.stringify({
                    accountId: account.id,
                    walletBalance: account.wallet,
                    auditLogEnabled: mcpServerConfig.auditableLog,
                    monitoringEnabled: mcpServerConfig.monitoringEnabled
                }, null, 2)
            }]
        };
    }
);

// Tool: Create a new account
server.tool(
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
        
        saveAccount(account);
        agentAuditLog(`Account created: ${JSON.stringify(account)}`);
        
        return {
            content: [{ 
                type: "text", 
                text: `Account created successfully. ID: ${account.id}, Wallet Balance: ${account.wallet}` 
            }]
        };
    }
);

// Tool: Place an order
server.tool(
    "place-order",
    {
        sku: z.string(),
        quantity: z.number().int().positive(),
        agentMode: z.boolean().default(false)
    },
    async ({ sku, quantity, agentMode }) => {
        const account = getAccount();
        if (!account) {
            agentAuditLog("Order failed: No account found.");
            return {
                content: [{ 
                    type: "text", 
                    text: "No account found. Create an account first using the 'create-account' tool." 
                }],
                isError: true
            };
        }
        
        try {
            // Fetch product details
            const res = await fetch(`${mcpServerConfig.sellerUrl}/products`);
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
            
            const response = await fetch(`${mcpServerConfig.sellerUrl}/order`, {
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
            saveAccount(account);
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

// Tool: Approve order
server.tool(
    "approve-order",
    { orderId: z.string() },
    async ({ orderId }) => {
        try {
            const response = await fetch(`${mcpServerConfig.sellerUrl}/approve`, {
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

// Tool: Start autonomous agent
server.tool(
    "start-autonomous-agent",
    {},
    async () => {
        const account = getAccount();
        if (!account) {
            agentAuditLog("Agent failed to start: No account found.");
            return {
                content: [{ 
                    type: "text", 
                    text: "No account found. Create an account first using the 'create-account' tool." 
                }],
                isError: true
            };
        }
        
        agentAuditLog(`Agent mode started for account: ${account.id}`);
        
        // Start the agent in a background process without blocking the response
        setTimeout(async () => {
            const agentProcess = async () => {
                while (true) {
                    await new Promise(res => setTimeout(res, Math.floor(Math.random() * 5000) + 1000));
                    
                    try {
                        // Fetch products
                        const res = await fetch(`${mcpServerConfig.sellerUrl}/products`);
                        if (!res.ok) {
                            agentAuditLog("Agent error: Failed to fetch products.");
                            continue;
                        }
                        
                        const products = await res.json();
                        if (!products || products.length === 0) {
                            agentAuditLog("Agent error: No products available.");
                            continue;
                        }
                        
                        // Read latest account info to get current balance
                        const accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
                        const currentAccount = JSON.parse(accountData);
                        
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
                        
                        const response = await fetch(`${mcpServerConfig.sellerUrl}/order`, {
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
                        agentAuditLog(`Agent error connecting to business API: ${error}`);
                    }
                }
            };
            
            agentProcess().catch(err => {
                agentAuditLog(`Autonomous agent error: ${err}`);
            });
        }, 0);
        
        return {
            content: [{ 
                type: "text", 
                text: `Autonomous agent mode started for account: ${account.id}. The agent will place random orders in the background.` 
            }]
        };
    }
);

// Tool: Get dashboard URL
server.tool(
    "get-dashboard-url",
    { port: z.number().default(6001) },
    async ({ port }) => {
        return {
            content: [{ 
                type: "text", 
                text: `Dashboard URL: http://localhost:${port}/dashboard\n\nNote: You need to run the dashboard server separately with:\n\nnode -e "require('./mcp-server.js').startDashboard(${port});"` 
            }]
        };
    }
);

// Export function to start the dashboard separately
export function startDashboard(port = 6001) {
    const express = require('express');
    const fetch = require('node-fetch');
    const fs = require('fs');
    const path = require('path');
    
    const ACCOUNT_FILE = path.join(__dirname, "account.json");
    
    if (!fs.existsSync(ACCOUNT_FILE)) {
        console.error('No account found. Create an account first using "create-account".');
        process.exit(1);
    }
    
    const accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
    const account = JSON.parse(accountData);
    const appDashboard = express();
    
    appDashboard.use(express.json());
    appDashboard.use(express.urlencoded({ extended: true }));

    appDashboard.get("/dashboard", async (req: Request, res: Response) => {
        try {
            // Fetch pending orders.
            const pendingResponse = await fetch(`${mcpServerConfig.sellerUrl}/pending`);
            if (!pendingResponse.ok) {
                res.send("Error fetching pending orders from business API.");
                return;
            }
            
            const pendingOrders = await pendingResponse.json();
            // Filter orders for this agent's account.
            const myPending = pendingOrders.filter(
                (order: any) => order.accountId === account.id
            );

            // Calculate agent pending totals.
            const totalPending = myPending.length;
            const totalPendingAmount = myPending.reduce(
                (sum: number, order: any) => sum + order.totalPrice,
                0
            );

            // Fetch overall stats.
            const statsResponse = await fetch(`${mcpServerConfig.sellerUrl}/stats`);
            const stats = statsResponse.ok
                ? await statsResponse.json()
                : { totalOrders: 0, totalAmountPaid: 0 };

            let html = `
              <!DOCTYPE html>
              <html>
              <head>
                <title>Agent Dashboard</title>
                <style>
                  body { font-family: Arial, sans-serif; margin: 20px; }
                  table { border-collapse: collapse; width: 100%; }
                  th, td { text-align: left; padding: 8px; border: 1px solid #ddd; }
                  tr:nth-child(even){ background-color: #f2f2f2; }
                  th { background-color: #4CAF50; color: white; }
                  button { padding: 5px 10px; }
                </style>
              </head>
              <body>
                <h1>Agent Dashboard</h1>
                <p>Pending Orders: ${totalPending} | Pending Total Amount: ${totalPendingAmount}</p>
                <p>Overall Delivered Orders: ${stats.totalOrders} | Total Amount Paid: ${stats.totalAmountPaid}</p>
                <table>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>SKU</th>
                      <th>Quantity</th>
                      <th>Total Price</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
            `;
            
            if (myPending.length === 0) {
                html += `<tr><td colspan="6" style="text-align:center;">No pending orders</td></tr>`;
            } else {
                myPending.forEach((order: any) => {
                    html += `<tr id="row-${order.id}">
                          <td>${order.id}</td>
                          <td>${order.sku}</td>
                          <td>${order.quantity}</td>
                          <td>${order.totalPrice}</td>
                          <td>${order.status}</td>
                          <td>
                            <button onclick="approveOrder('${order.id}')">Approve</button>
                          </td>
                        </tr>`;
                });
            }
            
            html += `
                  </tbody>
                </table>
                <script>
                  async function approveOrder(orderId) {
                    if (!confirm('Approve order ' + orderId + '?')) return;
                    try {
                      const response = await fetch('${mcpServerConfig.sellerUrl}/approve', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId })
                      });
                      const result = await response.json();
                      if (response.ok) {
                        alert('Order approved successfully.');
                        const row = document.getElementById('row-' + orderId);
                        if (row) row.remove();
                        location.reload();
                      } else {
                        alert('Error: ' + JSON.stringify(result));
                      }
                    } catch (err) {
                      alert('Error approving order: ' + err);
                    }
                  }
                </script>
              </body>
              </html>
            `;
            
            res.send(html);
        } catch (err) {
            res.send("Error loading dashboard: " + err);
        }
    });

    appDashboard.listen(port, () => {
        console.log(`Agent dashboard listening on port ${port}`);
        console.log(`Using seller service at: ${mcpServerConfig.sellerUrl}`);
    });
}

// Add a prompt for helping users get started
server.prompt(
    "get-started",
    {},
    () => ({
        messages: [{
            role: "user",
            content: {
                type: "text",
                text: "I want to learn how to use the UETA Agent MCP Server. What can it do and how do I get started?"
            }
        }]
    })
);

// Export necessary objects for running the server
export { server };

// Main function to start the server if run directly
async function main() {
    console.log(`Starting MCP server with seller URL: ${mcpServerConfig.sellerUrl}`);
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

// Run the server if this is the main module
if (require.main === module) {
    main().catch(console.error);
}
