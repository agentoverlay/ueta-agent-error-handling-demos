import express from "express";
import { v4 as uuid } from "uuid";
import fs from "fs";
import fetch from "node-fetch";
import { config } from "./config";

type Product = {
    sku: string;
    description: string;
    price: number;
};

type OrderStatus =
    | "received"
    | "pending_confirmation"
    | "delivered"
    | "error"
    | "reverted";

type Order = {
    id: string;
    accountId: string;
    sku: string;
    quantity: number;
    totalPrice: number;
    orderDate: Date;
    status: OrderStatus;
    error?: string;
};

const withError = process.argv.includes("--with-error");

const products: Product[] = [
    { sku: "SKU001", description: "Widget A", price: 50 },
    { sku: "SKU002", description: "Widget B", price: 30 },
    { sku: "SKU003", description: "Gadget C", price: 100 },
];

const orders: Order[] = [];

// Helper for auditable logging.
function auditLog(message: string) {
    const logLine = `${new Date().toISOString()} - ${message}`;
    fs.appendFileSync("audit.log", logLine + "\n");
    if (config.monitoringEnabled) {
        console.log(`[MONITOR] ${logLine}`);
    }
}

const app = express();
app.use(express.json());

// List available products.
app.get("/products", (req, res) => {
    res.json(products);
});

// List all orders (for audit purposes).
app.get("/orders", (req, res) => {
    res.json(orders);
});

// Endpoint to place an order.
app.post("/order", async (req, res) => {
    const { accountId, sku, quantity } = req.body;
    if (!accountId || !sku || typeof quantity !== "number" || quantity <= 0) {
        return res.status(400).json({ error: "Invalid payload" });
    }

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

    // Simulate error ~10% of the time if flag is active.
    if (withError && Math.random() < 0.1) {
        order.error = "Simulated error in order processing";
        order.status = "error";
        orders.push(order);
        auditLog(`Order error: ${JSON.stringify(order)}`);

        // Notify human service about the flagged order.
        try {
            await fetch("http://localhost:5002/flag", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(order),
            });
            auditLog(`Notified human service of error for order ${order.id}`);
        } catch (err) {
            auditLog(
                `Failed to notify human service for order ${order.id}: ${err}`,
            );
        }
        return res.status(201).json(order);
    }

    // Progressive confirmation if enabled.
    if (config.progressiveConfirmation) {
        order.status = "pending_confirmation";
        orders.push(order);
        auditLog(`Order pending confirmation: ${JSON.stringify(order)}`);
        setTimeout(() => {
            order.status = "delivered";
            auditLog(`Order confirmed and delivered: ${JSON.stringify(order)}`);
        }, 2000);
    } else {
        order.status = "delivered";
        orders.push(order);
        auditLog(`Order delivered: ${JSON.stringify(order)}`);
    }

    return res.status(201).json(order);
});

// Endpoint to revert an order (triggered by human intervention).
app.post("/revert", (req, res) => {
    const { orderId } = req.body;
    if (!orderId) {
        return res.status(400).json({ error: "orderId is required" });
    }
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
        return res.status(404).json({ error: "Order not found" });
    }
    if (order.status !== "error") {
        return res
            .status(400)
            .json({ error: "Only orders with error status can be reverted" });
    }
    order.status = "reverted";
    auditLog(`Order reverted by human intervention: ${JSON.stringify(order)}`);
    return res.status(200).json({ message: "Order reverted", order });
});

app.listen(4000, () => {
    console.log("Business API listening on port 4000");
    if (withError) {
        console.log("Running in error simulation mode (--with-error).");
    }
    console.log(`Configuration: ${JSON.stringify(config)}`);
});
