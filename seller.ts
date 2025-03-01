import express from "express";
import { v4 as uuid } from "uuid";

type Transaction = {
    id: string;
    amount: number;
    date: Date;
    accountId: string;
};

type Ledger = {
    id: string;
    name: string;
    // Using a simple object to store balances keyed by accountId.
    balance: Record<string, number>;
    transactions: Transaction[];
};

// Initialize the ledger (owned by the business)
const ledger: Ledger = {
    id: uuid(),
    name: "Business Ledger",
    balance: {},
    transactions: [],
};

const app = express();
app.use(express.json());

// GET endpoint to retrieve ledger data.
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

    // Calculate effective amount (withdrawals subtract funds).
    const effectiveAmount = type === "withdraw_money" ? -amount : amount;

    // Update the ledger balance for the provided account.
    ledger.balance[accountId] =
        (ledger.balance[accountId] || 0) + effectiveAmount;

    // Create and store the transaction.
    const transaction: Transaction = {
        id: uuid(),
        amount: effectiveAmount,
        date: new Date(),
        accountId,
    };
    ledger.transactions.push(transaction);

    return res.status(201).json(transaction);
});

app.listen(4000, () => {
    console.log("Business API listening on port 4000");
});
