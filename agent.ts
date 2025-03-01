#!/usr/bin/env ts-node

import { program } from "commander";
import { v4 as uuid } from "uuid";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { config } from "./config";

const ACCOUNT_FILE = path.join(__dirname, "account.json");
const STARTING_BALANCE = 1000;
const AGENT_AUDIT_FILE = path.join(__dirname, "agent_audit.log");

function agentAuditLog(message: string) {
    const logLine = `${new Date().toISOString()} - ${message}`;
    if (config.auditableLog) {
        fs.appendFileSync(AGENT_AUDIT_FILE, logLine + "\n");
    }
    if (config.monitoringEnabled) {
        console.log(`[AGENT MONITOR] ${logLine}`);
    }
}

// Create a new account.
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
        console.log("Account created:", account);
        agentAuditLog(`Account created: ${JSON.stringify(account)}`);
    });

// List available products.
program
    .command("list-products")
    .description("List available products")
    .action(async () => {
        try {
            const response = await fetch("http://localhost:4000/products");
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

// Place an order.
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
                agentAuditLog("Order failed: No account found.");
                process.exit(1);
            }
        }
        const accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
        let account = JSON.parse(accountData);
        let product;
        try {
            const res = await fetch("http://localhost:4000/products");
            if (!res.ok) {
                console.error("Error fetching products.");
                agentAuditLog("Error fetching products for order.");
                process.exit(1);
            }
            const products = await res.json();
            product = products.find((p: any) => p.sku === options.sku);
            if (!product) {
                console.error("Product not found for SKU:", options.sku);
                agentAuditLog(
                    `Order failed: Product not found for SKU ${options.sku}`,
                );
                process.exit(1);
            }
        } catch (error) {
            console.error("Error connecting to business API:", error);
            agentAuditLog(
                `Error connecting to business API while fetching products: ${error}`,
            );
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
                agentAuditLog(`Order error: ${JSON.stringify(errorData)}`);
                process.exit(1);
            }
            const order = await response.json();
            console.log("Order placed:", order);
            agentAuditLog(`Order placed: ${JSON.stringify(order)}`);
            account.wallet -= totalCost;
            fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2));
            console.log("Updated wallet balance:", account.wallet);
            agentAuditLog(`Updated wallet balance: ${account.wallet}`);
        } catch (error) {
            console.error("Error connecting to business API:", error);
            agentAuditLog(
                `Error connecting to business API while placing order: ${error}`,
            );
            process.exit(1);
        }
    });

// Autonomous agent mode.
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
        async function sendRandomOrder() {
            const delay = Math.floor(Math.random() * 5000) + 1000;
            await new Promise((res) => setTimeout(res, delay));
            let products;
            try {
                const res = await fetch("http://localhost:4000/products");
                if (!res.ok) {
                    console.error("Error fetching products.");
                    agentAuditLog("Agent error: Failed to fetch products.");
                    return;
                }
                products = await res.json();
            } catch (error) {
                console.error("Error connecting to business API:", error);
                agentAuditLog(
                    `Agent error connecting to business API: ${error}`,
                );
                return;
            }
            if (!products || products.length === 0) {
                console.error("No products available.");
                agentAuditLog("Agent error: No products available.");
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
                    agentAuditLog(
                        `Agent order error: ${JSON.stringify(errorData)}`,
                    );
                } else {
                    const order = await response.json();
                    console.log("Agent order placed:", order);
                    agentAuditLog(
                        `Agent order placed: ${JSON.stringify(order)}`,
                    );
                    account.wallet -= totalCost;
                    fs.writeFileSync(
                        ACCOUNT_FILE,
                        JSON.stringify(account, null, 2),
                    );
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
