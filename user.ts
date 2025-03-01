#!/usr/bin/env ts-node

import { program } from "commander";
import { v4 as uuid } from "uuid";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const ACCOUNT_FILE = path.join(__dirname, "account.json");

// The starting wallet balance for a new user.
const STARTING_BALANCE = 1000;

// -----------------------------
// create-account command:
// Creates a new account with an initial deposit (default deposit: 100)
// which is deducted from the wallet and sent to the business ledger.
program
    .command("create-account")
    .description("Create a new account for the user with an initial deposit")
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
            process.exit(1);
        }
        const account = {
            id: uuid(),
            wallet: STARTING_BALANCE - depositAmount,
        };
        fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2));
        console.log("Account created:", account);

        // Deposit the initial funds to the business ledger.
        const payload = {
            accountId: account.id,
            type: "add_money",
            amount: depositAmount,
        };

        try {
            const response = await fetch(
                "http://localhost:4000/ledger/transaction",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Error depositing initial funds:", errorData);
            } else {
                const transaction = await response.json();
                console.log("Initial deposit transaction:", transaction);
            }
        } catch (error) {
            console.error("Error connecting to business API:", error);
        }
    });

// -----------------------------
// transaction command:
// Sends a transaction (either add_money or withdraw_money)
// and updates the local wallet balance accordingly.
program
    .command("transaction")
    .description("Create a new transaction")
    .requiredOption(
        "--type <type>",
        "Transaction type: add_money or withdraw_money",
    )
    .requiredOption("--amount <amount>", "Transaction amount", parseFloat)
    .option(
        "--accountId <accountId>",
        "Account ID to use (if not provided, uses the stored account)",
    )
    .action(async (options) => {
        let accountId = options.accountId;
        if (!accountId) {
            if (fs.existsSync(ACCOUNT_FILE)) {
                const data = fs.readFileSync(ACCOUNT_FILE, "utf-8");
                const account = JSON.parse(data);
                accountId = account.id;
                if (
                    options.type === "add_money" &&
                    account.wallet < options.amount
                ) {
                    console.error("Insufficient funds in wallet.");
                    process.exit(1);
                }
            } else {
                console.error(
                    'No account found. Create an account first using "create-account".',
                );
                process.exit(1);
            }
        }
        // Load the account so we can update the wallet.
        const data = fs.readFileSync(ACCOUNT_FILE, "utf-8");
        const account = JSON.parse(data);

        const payload = {
            accountId,
            type: options.type,
            amount: options.amount,
        };

        try {
            const response = await fetch(
                "http://localhost:4000/ledger/transaction",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                },
            );
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Error:", errorData);
                process.exit(1);
            }
            const transaction = await response.json();
            console.log("Transaction created:", transaction);

            // Update the wallet balance:
            // For add_money, subtract funds (deposit); for withdraw_money, add funds.
            if (options.type === "add_money") {
                account.wallet -= options.amount;
            } else if (options.type === "withdraw_money") {
                account.wallet += options.amount;
            }
            fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2));
            console.log("Updated wallet balance:", account.wallet);
        } catch (error) {
            console.error("Error connecting to business API:", error);
            process.exit(1);
        }
    });

// -----------------------------
// agent command:
// Runs an autonomous agent that sends random transactions at random intervals.
// It picks a random type and random amount (between 10 and 100) for each transaction.
program
    .command("agent")
    .description(
        "Start autonomous agent mode (sends random transactions at random intervals)",
    )
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

        async function sendRandomTransaction() {
            // Wait a random delay between 1 and 5 seconds.
            const delay = Math.floor(Math.random() * 5000) + 1000;
            await new Promise((res) => setTimeout(res, delay));

            // Randomly choose a transaction type.
            const type = Math.random() < 0.5 ? "add_money" : "withdraw_money";
            // Random amount between 10 and 100.
            const amount = Math.floor(Math.random() * 91) + 10;

            // For deposits, ensure there are sufficient funds.
            if (type === "add_money" && account.wallet < amount) {
                console.log(
                    `Skipping add_money transaction: insufficient funds (wallet: ${account.wallet}, needed: ${amount})`,
                );
                return;
            }

            const payload = { accountId: account.id, type, amount };

            try {
                const response = await fetch(
                    "http://localhost:4000/ledger/transaction",
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    },
                );
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("Agent transaction error:", errorData);
                } else {
                    const transaction = await response.json();
                    console.log("Agent transaction:", transaction);
                    if (type === "add_money") {
                        account.wallet -= amount;
                    } else if (type === "withdraw_money") {
                        account.wallet += amount;
                    }
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
                await sendRandomTransaction();
            }
        }
        agentLoop();
    });

program.parse(process.argv);
