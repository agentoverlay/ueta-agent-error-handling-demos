#!/usr/bin/env ts-node

import { program } from "commander";
import { v4 as uuid } from "uuid";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";

// File where the created account is stored
const ACCOUNT_FILE = path.join(__dirname, "account.json");

// Command to create a new account.
// This generates a new account id and stores it in a local file.
program
    .command("create-account")
    .description("Create a new account for the user")
    .action(() => {
        const account = { id: uuid() };
        fs.writeFileSync(ACCOUNT_FILE, JSON.stringify(account, null, 2));
        console.log("Account created:", account);
    });

// Command to perform a transaction (add_money or withdraw_money).
// Usage: ts-node user.ts transaction --type add_money --amount 100 [--accountId <id>]
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
        "Account ID to use. If not provided, uses the stored account from create-account.",
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
        } catch (error) {
            console.error("Error connecting to business API:", error);
            process.exit(1);
        }
    });

program.parse(process.argv);
