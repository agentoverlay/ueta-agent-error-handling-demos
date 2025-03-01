#!/usr/bin/env ts-node

import { program } from "commander";
import { v4 as uuid } from "uuid";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { config } from "./config";

const ACCOUNT_FILE = path.join(__dirname, "account.json");
// Each new user starts with this wallet balance.
const STARTING_BALANCE = 1000;

// File to store user-side audit logs.
const USER_AUDIT_FILE = path.join(__dirname, "user_audit.log");

// Helper function to write auditable logs for the user CLI.
function userAuditLog(message: string) {
    const logLine = `${new Date().toISOString()} - ${message}`;
    if (config.auditableLog) {
        fs.appendFileSync(USER_AUDIT_FILE, logLine + "\n");
    }
    if (config.monitoringEnabled) {
        console.log(`[USER MONITOR] ${logLine}`);
    }
}

// -----------------------------
// create-account command:
// Creates a new account with an initial deposit (default deposit: 100)
// which is deducted from the wallet.
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
            userAuditLog(
                `Failed to create account: deposit (${depositAmount}) exceeds starting balance.`,
            );
            process.exit(1);
        }
        const account = {
            id: uuid(),
            wallet: STARTING_BALANCE - depositAmount,
        };
        fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2));
        console.log("Account created:", account);
        userAuditLog(`Account created: ${JSON.stringify(account)}`);
    });

// -----------------------------
// list-products command:
// Lists available products from the business API.
program
    .command("list-products")
    .description("List available products")
    .action(async () => {
        try {
            const response = await fetch("http://localhost:4000/products");
            if (!response.ok) {
                console.error("Error fetching products.");
                userAuditLog("Error fetching products from business API.");
                process.exit(1);
            }
            const products = await response.json();
            console.log("Available products:");
            products.forEach((p: any) => {
                console.log(
                    `SKU: ${p.sku}, Description: ${p.description}, Price: ${p.price}`,
                );
            });
            userAuditLog("Listed available products.");
        } catch (error) {
            console.error("Error connecting to business API:", error);
            userAuditLog(`Error connecting to business API: ${error}`);
            process.exit(1);
        }
    });

// -----------------------------
// order command:
// Places an order for a product.
// Usage: npm run start:user order -- --sku <sku> --quantity <n> [--accountId <id>]
program
    .command("order")
    .description("Place an order for a product")
    .requiredOption("--sku <sku>", "Product SKU")
    .requiredOption("--quantity <quantity>", "Quantity to order", parseInt)
    .option(
        "--accountId <accountId>",
        "Account ID (if not provided, uses stored account)",
    )
    .action(async (options) => {
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
                userAuditLog("Order failed: No account found.");
                process.exit(1);
            }
        }
        // Load account to update wallet later.
        const accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
        let account = JSON.parse(accountData);

        // Fetch product details to calculate total cost.
        let product;
        try {
            const res = await fetch("http://localhost:4000/products");
            if (!res.ok) {
                console.error("Error fetching products.");
                userAuditLog("Error fetching products for order.");
                process.exit(1);
            }
            const products = await res.json();
            product = products.find((p: any) => p.sku === options.sku);
            if (!product) {
                console.error("Product not found for SKU:", options.sku);
                userAuditLog(
                    `Order failed: Product not found for SKU ${options.sku}`,
                );
                process.exit(1);
            }
        } catch (error) {
            console.error("Error connecting to business API:", error);
            userAuditLog(
                `Error connecting to business API while fetching products: ${error}`,
            );
            process.exit(1);
        }

        const totalCost = product.price * options.quantity;
        if (account.wallet < totalCost) {
            console.error(
                `Insufficient funds in wallet. Wallet: ${account.wallet}, Order cost: ${totalCost}`,
            );
            userAuditLog(
                `Order failed: Insufficient funds. Wallet: ${account.wallet}, needed: ${totalCost}`,
            );
            process.exit(1);
        }

        const payload = {
            accountId,
            sku: options.sku,
            quantity: options.quantity,
        };

        try {
            const response = await fetch("http://localhost:4000/order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Error placing order:", errorData);
                userAuditLog(`Order error: ${JSON.stringify(errorData)}`);
                process.exit(1);
            }
            const order = await response.json();
            console.log("Order placed:", order);
            userAuditLog(`Order placed: ${JSON.stringify(order)}`);

            // Deduct funds from the wallet.
            account.wallet -= totalCost;
            fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2));
            console.log("Updated wallet balance:", account.wallet);
            userAuditLog(`Updated wallet balance: ${account.wallet}`);
        } catch (error) {
            console.error("Error connecting to business API:", error);
            userAuditLog(
                `Error connecting to business API while placing order: ${error}`,
            );
            process.exit(1);
        }
    });

// -----------------------------
// agent command:
// Runs an autonomous agent that places random orders at random intervals.
program
    .command("agent")
    .description("Start autonomous agent mode to place random orders")
    .action(async () => {
        if (!fs.existsSync(ACCOUNT_FILE)) {
            console.error(
                'No account found. Create an account first using "create-account".',
            );
            userAuditLog("Agent failed to start: No account found.");
            process.exit(1);
        }
        let accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
        let account = JSON.parse(accountData);

        console.log("Starting autonomous agent mode with account:", account.id);
        userAuditLog(`Agent mode started for account: ${account.id}`);

        async function sendRandomOrder() {
            // Wait a random delay between 1 and 5 seconds.
            const delay = Math.floor(Math.random() * 5000) + 1000;
            await new Promise((res) => setTimeout(res, delay));

            // Fetch available products.
            let products;
            try {
                const res = await fetch("http://localhost:4000/products");
                if (!res.ok) {
                    console.error("Error fetching products.");
                    userAuditLog("Agent error: Failed to fetch products.");
                    return;
                }
                products = await res.json();
            } catch (error) {
                console.error("Error connecting to business API:", error);
                userAuditLog(
                    `Agent error connecting to business API: ${error}`,
                );
                return;
            }
            if (!products || products.length === 0) {
                console.error("No products available.");
                userAuditLog("Agent error: No products available.");
                return;
            }

            // Choose a random product and quantity.
            const product =
                products[Math.floor(Math.random() * products.length)];
            const quantity = Math.floor(Math.random() * 5) + 1;
            const totalCost = product.price * quantity;

            if (account.wallet < totalCost) {
                console.log(
                    `Skipping order: insufficient funds (wallet: ${account.wallet}, needed: ${totalCost})`,
                );
                userAuditLog(
                    `Agent skipped order due to insufficient funds. Wallet: ${account.wallet}, needed: ${totalCost}`,
                );
                return;
            }

            const payload = {
                accountId: account.id,
                sku: product.sku,
                quantity,
            };

            try {
                const response = await fetch("http://localhost:4000/order", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("Agent order error:", errorData);
                    userAuditLog(
                        `Agent order error: ${JSON.stringify(errorData)}`,
                    );
                } else {
                    const order = await response.json();
                    console.log("Agent order placed:", order);
                    userAuditLog(
                        `Agent order placed: ${JSON.stringify(order)}`,
                    );
                    // Deduct funds from the wallet.
                    account.wallet -= totalCost;
                    fs.writeFileSync(
                        ACCOUNT_FILE,
                        JSON.stringify(account, null, 2),
                    );
                    console.log("Updated wallet balance:", account.wallet);
                    userAuditLog(
                        `Agent updated wallet balance: ${account.wallet}`,
                    );
                }
            } catch (error) {
                console.error("Error connecting to business API:", error);
                userAuditLog(
                    `Agent error connecting to business API while placing order: ${error}`,
                );
            }
        }

        async function agentLoop() {
            while (true) {
                await sendRandomOrder();
            }
        }
        agentLoop();
    });

program.parse(process.argv);
