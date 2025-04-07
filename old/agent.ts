#!/usr/bin/env ts-node

import express from "express";
import { program } from "commander";
import { v4 as uuid } from "uuid";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { config } from "./config";
import * as metrics from "./metrics/agent_metrics";

// Use environment variables with defaults for service URLs
const SELLER_URL = process.env.SELLER_URL || "http://localhost:4000";
const HUMAN_URL = process.env.HUMAN_URL || "http://localhost:5002";

const ACCOUNT_FILE = path.join(__dirname, "account.json");
const STARTING_BALANCE = 1000;
const AGENT_AUDIT_FILE = path.join(__dirname, "agent_audit.log");

// Helper for agent audit logging.
function agentAuditLog(message: string) {
    const logLine = `${new Date().toISOString()} - ${message}`;
    if (config.auditableLog) {
        fs.appendFileSync(AGENT_AUDIT_FILE, logLine + "\n");
    }
    if (config.monitoringEnabled) {
        console.log(`[AGENT MONITOR] ${logLine}`);
    }
}

// Setup metrics endpoint in a express app
const metricsApp = express();
metricsApp.get("/metrics", async (req, res) => {
    res.set("Content-Type", metrics.register.contentType);
    res.end(await metrics.register.metrics());
});

const METRICS_PORT = 7001;
metricsApp.listen(METRICS_PORT, () => {
    console.log(
        `Agent metrics available at http://localhost:${METRICS_PORT}/metrics`,
    );
    console.log(`Using seller service at: ${SELLER_URL}`);
    console.log(`Using human service at: ${HUMAN_URL}`);
});

// Command: Create a new account.
program
    .command("create-account")
    .description("Create a new account with a wallet balance")
    .option(
        "--deposit <amount>",
        "Initial deposit amount",
        (val) => parseFloat(val),
        100,
    )
    .action(async (options) => {
        const depositAmount = options.deposit;
        if (depositAmount > STARTING_BALANCE) {
            console.error("Deposit amount exceeds starting balance.");
            agentAuditLog(
                `Failed to create account: deposit ${depositAmount} exceeds starting balance.`,
            );
            process.exit(1);
        }
        const account = {
            id: uuid(),
            wallet: STARTING_BALANCE - depositAmount,
        };
        fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2));

        // Update metrics
        metrics.walletBalanceGauge.set(account.wallet);

        console.log("Account created:", account);
        agentAuditLog(`Account created: ${JSON.stringify(account)}`);
    });

// Command: List available products.
program
    .command("list-products")
    .description("List available products")
    .action(async () => {
        try {
            const response = await fetch(`${SELLER_URL}/products`);
            if (!response.ok) {
                console.error("Error fetching products.");
                agentAuditLog("Error fetching products from business API.");
                process.exit(1);
            }
            const products = await response.json();
            console.log("Available products:");
            products.forEach((p: any) => {
                console.log(
                    `SKU: ${p.sku}, Description: ${p.description}, Price: ${p.price}`,
                );
            });
            agentAuditLog("Listed available products.");
        } catch (error) {
            console.error("Error connecting to business API:", error);
            agentAuditLog(`Error connecting to business API: ${error}`);
            process.exit(1);
        }
    });

// Command: Place an order.
program
    .command("order")
    .description("Place an order for a product")
    .requiredOption("--sku <sku>", "Product SKU")
    .requiredOption("--quantity <quantity>", "Quantity to order", parseInt)
    .option(
        "--accountId <accountId>",
        "Account ID (if not provided, uses stored account)",
    )
    // Specify agent flag so the business can apply the 1/10 probability check.
    .option("--agent", "Indicate this order is placed by the agent", false)
    .action(async (options) => {
        // Increment order attempt counter
        metrics.orderAttemptCounter.inc();

        let accountId = options.accountId;
        if (!accountId) {
            if (fs.existsSync(ACCOUNT_FILE)) {
                const data = fs.readFileSync(ACCOUNT_FILE, "utf-8");
                const account = JSON.parse(data);
                accountId = account.id;
            } else {
                console.error(
                    'No account found. Create an account first using "create-account".',
                );
                agentAuditLog("Order failed: No account found.");

                // Increment error counter
                metrics.orderErrorCounter.inc();

                process.exit(1);
            }
        }
        const accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
        let account = JSON.parse(accountData);
        let product;
        try {
            const res = await fetch(`${SELLER_URL}/products`);
            if (!res.ok) {
                console.error("Error fetching products.");
                agentAuditLog("Error fetching products for order.");

                // Increment error counter
                metrics.orderErrorCounter.inc();

                process.exit(1);
            }
            const products = await res.json();
            product = products.find((p: any) => p.sku === options.sku);
            if (!product) {
                console.error("Product not found for SKU:", options.sku);
                agentAuditLog(
                    `Order failed: Product not found for SKU ${options.sku}`,
                );

                // Increment error counter
                metrics.orderErrorCounter.inc();

                process.exit(1);
            }
        } catch (error) {
            console.error("Error connecting to business API:", error);
            agentAuditLog(
                `Error connecting to business API while fetching products: ${error}`,
            );

            // Increment error counter
            metrics.orderErrorCounter.inc();

            process.exit(1);
        }
        const totalCost = product.price * options.quantity;
        if (account.wallet < totalCost) {
            console.error(
                `Insufficient funds in wallet. Wallet: ${account.wallet}, Order cost: ${totalCost}`,
            );
            agentAuditLog(
                `Order failed: Insufficient funds. Wallet: ${account.wallet}, needed: ${totalCost}`,
            );

            // Increment error counter
            metrics.orderErrorCounter.inc();

            process.exit(1);
        }
        const payload = {
            accountId,
            sku: options.sku,
            quantity: options.quantity,
            agent: options.agent || false,
        };
        try {
            const startTime = process.hrtime();

            const response = await fetch(`${SELLER_URL}/order`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            // Calculate response time
            const duration = process.hrtime(startTime);
            metrics.orderResponseTimeHistogram.observe(
                duration[0] + duration[1] / 1e9,
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Error placing order:", errorData);
                agentAuditLog(`Order error: ${JSON.stringify(errorData)}`);

                // Increment error counter
                metrics.orderErrorCounter.inc();

                process.exit(1);
            }
            const order = await response.json();
            console.log("Order placed:", order);
            agentAuditLog(`Order placed: ${JSON.stringify(order)}`);

            // Increment order placed counter
            metrics.orderPlacedCounter.inc();

            account.wallet -= totalCost;
            fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2));

            // Update wallet balance metric
            metrics.walletBalanceGauge.set(account.wallet);

            console.log("Updated wallet balance:", account.wallet);
            agentAuditLog(`Updated wallet balance: ${account.wallet}`);
        } catch (error) {
            console.error("Error connecting to business API:", error);
            agentAuditLog(
                `Error connecting to business API while placing order: ${error}`,
            );

            // Increment error counter
            metrics.orderErrorCounter.inc();

            process.exit(1);
        }
    });

// Command: Autonomous agent mode.
program
    .command("agent")
    .description("Start autonomous agent mode to place random orders")
    .action(async () => {
        if (!fs.existsSync(ACCOUNT_FILE)) {
            console.error(
                'No account found. Create an account first using "create-account".',
            );
            agentAuditLog("Agent failed to start: No account found.");
            process.exit(1);
        }
        let accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
        let account = JSON.parse(accountData);
        console.log("Starting autonomous agent mode with account:", account.id);
        agentAuditLog(`Agent mode started for account: ${account.id}`);

        // Initialize wallet balance metric
        metrics.walletBalanceGauge.set(account.wallet);

        async function sendRandomOrder() {
            // Increment order attempt counter
            metrics.orderAttemptCounter.inc();

            const delay = Math.floor(Math.random() * 5000) + 1000;
            await new Promise((res) => setTimeout(res, delay));
            let products;
            try {
                const res = await fetch(`${SELLER_URL}/products`);
                if (!res.ok) {
                    console.error("Error fetching products.");
                    agentAuditLog("Agent error: Failed to fetch products.");

                    // Increment error counter
                    metrics.orderErrorCounter.inc();

                    return;
                }
                products = await res.json();
            } catch (error) {
                console.error("Error connecting to business API:", error);
                agentAuditLog(
                    `Agent error connecting to business API: ${error}`,
                );

                // Increment error counter
                metrics.orderErrorCounter.inc();

                return;
            }
            if (!products || products.length === 0) {
                console.error("No products available.");
                agentAuditLog("Agent error: No products available.");

                // Increment error counter
                metrics.orderErrorCounter.inc();

                return;
            }
            const product =
                products[Math.floor(Math.random() * products.length)];
            const quantity = Math.floor(Math.random() * 5) + 1;
            const totalCost = product.price * quantity;
            if (account.wallet < totalCost) {
                console.log(
                    `Skipping order: insufficient funds (wallet: ${account.wallet}, needed: ${totalCost})`,
                );
                agentAuditLog(
                    `Agent skipped order due to insufficient funds. Wallet: ${account.wallet}, needed: ${totalCost}`,
                );

                // Increment error counter
                metrics.orderErrorCounter.inc();

                return;
            }
            const payload = {
                accountId: account.id,
                sku: product.sku,
                quantity,
                agent: true,
            };
            try {
                const startTime = process.hrtime();

                const response = await fetch(`${SELLER_URL}/order`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                // Calculate response time
                const duration = process.hrtime(startTime);
                metrics.orderResponseTimeHistogram.observe(
                    duration[0] + duration[1] / 1e9,
                );

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("Agent order error:", errorData);
                    agentAuditLog(
                        `Agent order error: ${JSON.stringify(errorData)}`,
                    );

                    // Increment error counter
                    metrics.orderErrorCounter.inc();
                } else {
                    const order = await response.json();
                    console.log("Agent order placed:", order);
                    agentAuditLog(
                        `Agent order placed: ${JSON.stringify(order)}`,
                    );

                    // Increment order placed counter
                    metrics.orderPlacedCounter.inc();

                    account.wallet -= totalCost;
                    fs.writeFileSync(
                        ACCOUNT_FILE,
                        JSON.stringify(account, null, 2),
                    );

                    // Update wallet balance metric
                    metrics.walletBalanceGauge.set(account.wallet);

                    console.log("Updated wallet balance:", account.wallet);
                    agentAuditLog(
                        `Agent updated wallet balance: ${account.wallet}`,
                    );
                }
            } catch (error) {
                console.error("Error connecting to business API:", error);
                agentAuditLog(
                    `Agent error connecting to business API while placing order: ${error}`,
                );

                // Increment error counter
                metrics.orderErrorCounter.inc();
            }
        }
        async function agentLoop() {
            while (true) {
                await sendRandomOrder();
            }
        }
        agentLoop();
    });

program
    .command("dashboard")
    .description(
        "Launch the agent dashboard to view pending orders and overall stats",
    )
    .option(
        "--port <port>",
        "Port for the agent dashboard",
        (val) => parseInt(val),
        6001,
    )
    .action(async (options) => {
        if (!fs.existsSync(ACCOUNT_FILE)) {
            console.error(
                'No account found. Create an account first using "create-account".',
            );
            process.exit(1);
        }
        const accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
        const account = JSON.parse(accountData);
        const appDashboard = express();
        appDashboard.use(express.json());
        appDashboard.use(express.urlencoded({ extended: true }));

        // Add metrics endpoint to the dashboard
        appDashboard.get("/metrics", async (req, res) => {
            res.set("Content-Type", metrics.register.contentType);
            res.end(await metrics.register.metrics());
        });

        appDashboard.get("/dashboard", async (req, res) => {
            try {
                // Fetch pending orders.
                const pendingResponse = await fetch(`${SELLER_URL}/pending`);
                if (!pendingResponse.ok) {
                    res.send(
                        "Error fetching pending orders from business API.",
                    );
                    return;
                }
                const pendingOrders = await pendingResponse.json();
                // Filter orders for this agent's account.
                const myPending = pendingOrders.filter(
                    (order: any) => order.accountId === account.id,
                );

                // Calculate agent pending totals.
                const totalPending = myPending.length;
                const totalPendingAmount = myPending.reduce(
                    (sum: number, order: any) => sum + order.totalPrice,
                    0,
                );

                // Fetch overall stats.
                const statsResponse = await fetch(`${SELLER_URL}/stats`);
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
            <p>Wallet Balance: ${account.wallet}</p>
            <p><a href="/metrics" target="_blank">View Metrics</a></p>
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
                  const response = await fetch('${SELLER_URL}/approve', {
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

        const port = options.port;
        appDashboard.listen(port, () => {
            console.log(`Agent dashboard listening on port ${port}`);
            console.log(
                `Agent dashboard metrics available at http://localhost:${port}/metrics`,
            );
        });
    });

program.parse(process.argv);
