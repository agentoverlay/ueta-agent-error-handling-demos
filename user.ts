#!/usr/bin/env ts-node

import { program } from "commander";
import { v4 as uuid } from "uuid";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const ACCOUNT_FILE = path.join(__dirname, "account.json");
// Each new user starts with this wallet balance.
const STARTING_BALANCE = 100000;

// Command to create a new account. The wallet is initialized with STARTING_BALANCE minus an optional deposit.
program
    .command("create-account")
    .description("Create a new account with a wallet balance")
    .option(
        "--deposit <amount>",
        "Initial deposit (order credit) amount",
        (val) => parseFloat(val),
        100,
    )
    .action(async (options) => {
        const depositAmount = options.deposit;
        if (depositAmount > STARTING_BALANCE) {
            console.error("Deposit amount exceeds starting balance.");
            process.exit(1);
        }
        const account = {
            id: uuid(),
            wallet: STARTING_BALANCE - depositAmount,
        };
        fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2));
        console.log("Account created:", account);
    });

// Command to list available products from the business.
program
    .command("list-products")
    .description("List available products")
    .action(async () => {
        try {
            const response = await fetch("http://localhost:4000/products");
            if (!response.ok) {
                console.error("Error fetching products.");
                process.exit(1);
            }
            const products = await response.json();
            console.log("Available products:");
            products.forEach((p: any) => {
                console.log(
                    `SKU: ${p.sku}, Description: ${p.description}, Price: ${p.price}`,
                );
            });
        } catch (error) {
            console.error("Error connecting to business API:", error);
            process.exit(1);
        }
    });

// Command to place an order.
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
                process.exit(1);
            }
        }
        // Load account so we can update the wallet.
        const accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
        let account = JSON.parse(accountData);

        // Fetch products to get the price for the provided SKU.
        let product;
        try {
            const res = await fetch("http://localhost:4000/products");
            if (!res.ok) {
                console.error("Error fetching products.");
                process.exit(1);
            }
            const products = await res.json();
            product = products.find((p: any) => p.sku === options.sku);
            if (!product) {
                console.error("Product not found for SKU:", options.sku);
                process.exit(1);
            }
        } catch (error) {
            console.error("Error connecting to business API:", error);
            process.exit(1);
        }

        const totalCost = product.price * options.quantity;
        if (account.wallet < totalCost) {
            console.error(
                `Insufficient funds in wallet. Wallet: ${account.wallet}, Order cost: ${totalCost}`,
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
                process.exit(1);
            }
            const order = await response.json();
            console.log("Order placed:", order);

            // Deduct funds from the wallet.
            account.wallet -= totalCost;
            fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2));
            console.log("Updated wallet balance:", account.wallet);
        } catch (error) {
            console.error("Error connecting to business API:", error);
            process.exit(1);
        }
    });

// Command to run an autonomous agent that places random orders.
program
    .command("agent")
    .description("Start autonomous agent mode to place random orders")
    .action(async () => {
        if (!fs.existsSync(ACCOUNT_FILE)) {
            console.error(
                'No account found. Create an account first using "create-account".',
            );
            process.exit(1);
        }
        let accountData = fs.readFileSync(ACCOUNT_FILE, "utf-8");
        let account = JSON.parse(accountData);

        console.log("Starting autonomous agent mode with account:", account.id);

        async function sendRandomOrder() {
            // Wait a random delay between 1 and 5 seconds.
            const delay = Math.floor(Math.random() * 5000) + 1000;
            await new Promise((res) => setTimeout(res, delay));

            // Fetch products.
            let products;
            try {
                const res = await fetch("http://localhost:4000/products");
                if (!res.ok) {
                    console.error("Error fetching products.");
                    return;
                }
                products = await res.json();
            } catch (error) {
                console.error("Error connecting to business API:", error);
                return;
            }
            if (!products || products.length === 0) {
                console.error("No products available.");
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
                } else {
                    const order = await response.json();
                    console.log("Agent order placed:", order);
                    // Deduct funds from the wallet.
                    account.wallet -= totalCost;
                    fs.writeFileSync(
                        ACCOUNT_FILE,
                        JSON.stringify(account, null, 2),
                    );
                    console.log("Updated wallet balance:", account.wallet);
                }
            } catch (error) {
                console.error("Error connecting to business API:", error);
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
