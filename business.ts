import express from "express";
import { v4 as uuid } from "uuid";
import fs from "fs";
import { config } from "./config";

type Product = {
    sku: string;
    description: string;
    price: number;
};

type Order = {
    id: string;
    accountId: string;
    sku: string;
    quantity: number;
    totalPrice: number;
    orderDate: Date;
    status: "received" | "pending_confirmation" | "delivered" | "error";
    error?: string;
};

// Flag to simulate errors (if provided, ~10% of orders will error)
const withError = process.argv.includes("--with-error");

// A sample list of products
const products: Product[] = [
    { sku: "SKU001", description: "Widget A", price: 50 },
    { sku: "SKU002", description: "Widget B", price: 30 },
    { sku: "SKU003", description: "Gadget C", price: 100 },
];

// Store orders in memory for demonstration purposes.
const orders: Order[] = [];

// Helper function to write audit logs.
function auditLog(message: string) {
    const logLine = `${new Date().toISOString()} - ${message}`;
    if (config.auditableLog) {
        fs.appendFileSync("audit.log", logLine + "\n");
    }
    if (config.monitoringEnabled) {
        console.log(`[MONITOR] ${logLine}`);
    }
}

const app = express();
app.use(express.json());

// Endpoint to list available products.
app.get("/products", (req, res) => {
    res.json(products);
});

// Endpoint to place an order.
app.post("/order", (req, res) => {
    const { accountId, sku, quantity } = req.body;
    if (!accountId || !sku || typeof quantity !== "number" || quantity <= 0) {
        return res.status(400).json({ error: "Invalid payload" });
    }

    // Find the product by SKU.
    const product = products.find((p) => p.sku === sku);
    if (!product) {
        return res.status(404).json({ error: "Product not found" });
    }

    const totalPrice = product.price * quantity;
    const order: Order = {
        id: uuid(),
        accountId,
        sku,
        quantity,
        totalPrice,
        orderDate: new Date(),
        status: "received",
    };

    // Simulate error in 10% of orders when the flag is active.
    if (withError && Math.random() < 0.1) {
        order.error = "Simulated error in order processing";
        order.status = "error";
        orders.push(order);
        auditLog(`Order error: ${JSON.stringify(order)}`);
        return res.status(201).json(order);
    }

    // If progressive confirmation is enabled, mark order as pending first.
    if (config.progressiveConfirmation) {
        order.status = "pending_confirmation";
        orders.push(order);
        auditLog(`Order pending confirmation: ${JSON.stringify(order)}`);
        // Simulate confirmation after a delay (e.g., 2 seconds).
        setTimeout(() => {
            order.status = "delivered";
            auditLog(`Order confirmed and delivered: ${JSON.stringify(order)}`);
        }, 2000);
    } else {
        // Otherwise, mark order as delivered immediately.
        order.status = "delivered";
        orders.push(order);
        auditLog(`Order delivered: ${JSON.stringify(order)}`);
    }

    return res.status(201).json(order);
});

// Optional: Endpoint to retrieve all orders (for audit purposes).
app.get("/orders", (req, res) => {
    res.json(orders);
});

app.listen(4000, () => {
    console.log("Business API listening on port 4000");
    if (withError) {
        console.log("Running in error simulation mode (--with-error).");
    }
    console.log(`Configuration: ${JSON.stringify(config)}`);
});
