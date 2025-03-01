import express from "express";
import { v4 as uuid } from "uuid";
// If using Node 18+, the fetch API is built in. Otherwise, you can use node-fetch.
import fetch from "node-fetch";

type Account = {
    id: string;
};

// Simple in-memory store for accounts.
const accounts: Record<string, Account> = {};

const app = express();
app.use(express.json());

// Endpoint to create a new account.
app.post("/account", (req, res) => {
    const account: Account = { id: uuid() };
    accounts[account.id] = account;
    res.status(201).json(account);
});

// Endpoint for the user to create a transaction.
// Expected payload: { accountId: string, type: "add_money" | "withdraw_money", amount: number }
app.post("/transaction", async (req, res) => {
    const { accountId, type, amount } = req.body;
    if (!accountId || !type || typeof amount !== "number") {
        return res.status(400).json({ error: "Invalid payload" });
    }

    // Ensure the account exists.
    if (!accounts[accountId]) {
        return res.status(404).json({ error: "Account not found" });
    }

    try {
        // Forward the transaction to the business ledger API.
        const response = await fetch(
            "http://localhost:4000/ledger/transaction",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accountId, type, amount }),
            },
        );

        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json(errorData);
        }

        const transaction = await response.json();
        res.status(201).json(transaction);
    } catch (error) {
        res.status(500).json({ error: "Error connecting to business API" });
    }
});

app.listen(3000, () => {
    console.log("User API listening on port 3000");
});
