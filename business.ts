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
// Human service port is determined by the environment variable (default to 5002).
const HUMAN_SERVICE_PORT = process.env.HUMAN_PORT
    ? process.env.HUMAN_PORT
    : "5002";

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

// --- Public Endpoints ---

// List available products.
app.get("/products", (req, res) => {
    res.json(products);
});

// Return all orders (for audit purposes).
app.get("/orders", (req, res) => {
    res.json(orders);
});

// Return only orders that are pending confirmation.
app.get("/pending", (req, res) => {
    const pendingOrders = orders.filter(
        (o) => o.status === "pending_confirmation",
    );
    res.json(pendingOrders);
});

// --- Approval Endpoint ---
// When a human approves an order via the human dashboard, this endpoint updates the order status.
app.post("/approve", (req, res) => {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: "orderId is required" });
    const order = orders.find((o) => o.id === orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.status !== "pending_confirmation") {
        return res
            .status(400)
            .json({ error: "Only orders pending approval can be approved" });
    }
    order.status = "delivered";
    auditLog(`Order approved and delivered: ${JSON.stringify(order)}`);
    res.status(200).json({ message: "Order approved", order });
});

// --- Order Endpoint ---
app.post("/order", async (req, res) => {
    const { accountId, sku, quantity } = req.body;
    if (!accountId || !sku || typeof quantity !== "number" || quantity <= 0) {
        return res.status(400).json({ error: "Invalid payload" });
    }

    const product = products.find((p) => p.sku === sku);
    if (!product) return res.status(404).json({ error: "Product not found" });

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

    // Simulate an error ~10% of the time when error simulation is enabled.
    if (withError && Math.random() < 0.1) {
        order.error = "Simulated error in order processing";
        order.status = "error";
        orders.push(order);
        auditLog(`Order error: ${JSON.stringify(order)}`);
        try {
            await fetch(`http://localhost:${HUMAN_SERVICE_PORT}/flag`, {
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

    // Handle progressive confirmation.
    if (config.progressiveConfirmation) {
        order.status = "pending_confirmation";
        orders.push(order);
        auditLog(`Order pending approval: ${JSON.stringify(order)}`);
        // Notify the human service about the pending order.
        try {
            await fetch(`http://localhost:${HUMAN_SERVICE_PORT}/flag`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(order),
            });
            auditLog(`Notified human service of pending order ${order.id}`);
        } catch (err) {
            auditLog(
                `Failed to notify human service for order ${order.id}: ${err}`,
            );
        }
    } else {
        // Auto-confirm mode: deliver order after a short delay.
        order.status = "delivered";
        orders.push(order);
        auditLog(`Order delivered: ${JSON.stringify(order)}`);
    }

    return res.status(201).json(order);
});

// Endpoint for human intervention to revert an order.
app.post("/revert", (req, res) => {
    const { orderId } = req.body;
    if (!orderId) {
        return res.status(400).json({ error: "orderId is required" });
    }
    const order = orders.find((o) => o.id === orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
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
    console.log(
        `Human service notifications will be sent to port ${HUMAN_SERVICE_PORT}`,
    );
    console.log(`Configuration: ${JSON.stringify(config)}`);
});
