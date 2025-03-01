import express from "express";
import { v4 as uuid } from "uuid";

type Transaction = {
    id: string;
    amount: number;
    date: Date;
    accountId: string;
    error?: string;
};

type Ledger = {
    id: string;
    name: string;
    // The balance is kept per account.
    balance: Record<string, number>;
    transactions: Transaction[];
};

// Check for the flag; if present, simulate errors in 1 out of 10 transactions.
const withError = process.argv.includes("--with-error");

const ledger: Ledger = {
    id: uuid(),
    name: "Business Ledger",
    balance: {},
    transactions: [],
};

const app = express();
app.use(express.json());

app.get("/ledger", (req, res) => {
    res.json(ledger);
});

// POST endpoint to add a transaction to the ledger.
// Expected payload: { accountId: string, type: "add_money" | "withdraw_money", amount: number }
app.post("/ledger/transaction", (req, res) => {
    const { accountId, type, amount } = req.body;
    if (!accountId || !type || typeof amount !== "number") {
        return res.status(400).json({ error: "Invalid payload" });
    }

    // For withdrawals, the effective amount is negative.
    const effectiveAmount = type === "withdraw_money" ? -amount : amount;

    const transaction: Transaction = {
        id: uuid(),
        amount: effectiveAmount,
        date: new Date(),
        accountId,
    };

    // Check for simulated error: 10% chance if withError flag is active.
    if (withError && Math.random() < 0.1) {
        transaction.error = "Simulated error";
        ledger.transactions.push(transaction);
        console.error(
            `[ERROR] Faulty transaction recorded: ${JSON.stringify(
                transaction,
            )}`,
        );
        console.log(
            `Latest balance for account ${accountId}: ${
                ledger.balance[accountId] || 0
            }`,
        );
        return res.status(201).json(transaction);
    }

    // Update ledger and push transaction.
    ledger.balance[accountId] =
        (ledger.balance[accountId] || 0) + effectiveAmount;
    ledger.transactions.push(transaction);

    // Log transaction and the latest balance.
    console.log(`[INFO] Transaction recorded: ${JSON.stringify(transaction)}`);
    console.log(
        `Latest balance for account ${accountId}: ${ledger.balance[accountId]}`,
    );

    return res.status(201).json(transaction);
});

app.listen(4000, () => {
    console.log("Business API listening on port 4000");
    if (withError) {
        console.log("Running in error simulation mode (--with-error).");
    }
});
