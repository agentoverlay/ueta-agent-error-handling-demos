import express from "express";
import cors from "cors";
import { v4 as uuid } from "uuid";
import fs from "fs";
import fetch from "node-fetch";
import { config } from "./config";
import * as metrics from "./metrics/seller_metrics";

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
// Consumer service port and URL are determined by environment variables
const CONSUMER_SERVICE_PORT = process.env.CONSUMER_PORT || "5002";
const CONSUMER_SERVICE_URL = process.env.CONSUMER_URL || `http://consumer:${CONSUMER_SERVICE_PORT}`;

console.log(`Consumer service URL set to: ${CONSUMER_SERVICE_URL}`);

const products: Product[] = [
    { sku: "APPLES", description: "Fresh Red Apples (1 lb)", price: 2.99 },
    { sku: "BANANAS", description: "Organic Bananas (bunch)", price: 1.49 },
    { sku: "MILK", description: "Whole Milk (1 gallon)", price: 3.75 },
    { sku: "BREAD", description: "Whole Wheat Bread", price: 2.25 },
    { sku: "EGGS", description: "Large Eggs (dozen)", price: 3.99 },
    { sku: "CHEESE", description: "Cheddar Cheese Block (8 oz)", price: 4.50 }
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
app.use(cors());
app.use(express.json());

// Expose metrics endpoint
app.get("/metrics", async (req, res) => {
    res.set("Content-Type", metrics.register.contentType);
    res.end(await metrics.register.metrics());
});

// --- Public Endpoints ---

// List available products.
app.get("/products", (req, res) => {
    res.json(products);
});

// Return all orders.
app.get("/orders", (req, res) => {
    res.json(orders);
});

// Return only orders that are pending confirmation.
app.get("/pending", (req, res) => {
    const pendingOrders = orders.filter(
        (o) => o.status === "pending_confirmation",
    );
    // Update pending orders metric
    metrics.pendingOrdersGauge.set(pendingOrders.length);
    res.json(pendingOrders);
});

// New endpoint: Return overall statistics.
app.get("/stats", (req, res) => {
    const deliveredOrders = orders.filter((o) => o.status === "delivered");
    const totalOrders = deliveredOrders.length;
    const totalAmountPaid = deliveredOrders.reduce(
        (sum, o) => sum + o.totalPrice,
        0,
    );
    res.json({ totalOrders, totalAmountPaid });
});

// --- Approval Endpoint ---
// When a consumer approves an order via the consumer dashboard, this endpoint updates the order status.
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
    // Update metrics: decrement pending, increment delivered
    metrics.orderCounter.inc({ status: "delivered" });
    metrics.pendingOrdersGauge.dec();
    
    auditLog(`Order approved and delivered: ${JSON.stringify(order)}`);
    res.status(200).json({ message: "Order approved", order });
});

// --- Order Endpoint ---
app.post("/order", async (req, res) => {
    const startTime = process.hrtime();
    const { accountId, sku, quantity, agent } = req.body;
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

    // Record order value
    metrics.orderValueSummary.observe(totalPrice);

    // Simulate error ~10% of the time if withError is active.
    if (withError && Math.random() < 0.1) {
        order.error = "Simulated error in order processing";
        order.status = "error";
        orders.push(order);
        
        // Update error orders metric
        metrics.orderCounter.inc({ status: "error" });
        metrics.errorOrdersGauge.inc();
        
        auditLog(`Order error: ${JSON.stringify(order)}`);
        try {
            await fetch(`${CONSUMER_SERVICE_URL}/flag`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(order),
            });
            auditLog(`Notified consumer service of error for order ${order.id}`);
        } catch (err) {
            auditLog(
                `Failed to notify consumer service for order ${order.id}: ${err}`,
            );
        }
        
        // Record processing duration
        const duration = process.hrtime(startTime);
        metrics.orderDurationHistogram.observe(duration[0] + duration[1] / 1e9);
        
        return res.status(201).json(order);
    }

    // Determine approval requirement.
    if (agent === true) {
        // For agent orders, use progressive confirmation if enabled or 1/10 probability.
        if (config.progressiveConfirmation || Math.random() < 0.1) {
            order.status = "pending_confirmation";
            orders.push(order);
            
            // Update pending metric
            metrics.orderCounter.inc({ status: "pending_confirmation" });
            metrics.pendingOrdersGauge.inc();
            
            auditLog(`Agent order pending approval: ${JSON.stringify(order)}`);
            try {
                await fetch(`${CONSUMER_SERVICE_URL}/flag`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(order),
                });
                auditLog(
                    `Notified consumer service of pending agent order ${order.id}`,
                );
            } catch (err) {
                auditLog(
                    `Failed to notify consumer service for agent order ${order.id}: ${err}`,
                );
            }
        } else {
            order.status = "delivered";
            orders.push(order);
            
            // Update delivered metric
            metrics.orderCounter.inc({ status: "delivered" });
            
            auditLog(`Agent order delivered: ${JSON.stringify(order)}`);
        }
    } else {
        // For normal orders.
        if (config.progressiveConfirmation) {
            order.status = "pending_confirmation";
            orders.push(order);
            
            // Update pending metric
            metrics.orderCounter.inc({ status: "pending_confirmation" });
            metrics.pendingOrdersGauge.inc();
            
            auditLog(`Order pending approval: ${JSON.stringify(order)}`);
            try {
                await fetch(`${CONSUMER_SERVICE_URL}/flag`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(order),
                });
                auditLog(`Notified consumer service of pending order ${order.id}`);
            } catch (err) {
                auditLog(
                    `Failed to notify consumer service for order ${order.id}: ${err}`,
                );
            }
        } else {
            order.status = "delivered";
            orders.push(order);
            
            // Update delivered metric
            metrics.orderCounter.inc({ status: "delivered" });
            
            auditLog(`Order delivered: ${JSON.stringify(order)}`);
        }
    }

    // Record processing duration
    const duration = process.hrtime(startTime);
    metrics.orderDurationHistogram.observe(duration[0] + duration[1] / 1e9);
    
    return res.status(201).json(order);
});

// Endpoint for consumer intervention to revert an order.
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
    
    // Update metrics
    metrics.orderCounter.inc({ status: "reverted" });
    metrics.errorOrdersGauge.dec();
    
    order.status = "reverted";
    auditLog(`Order reverted by consumer intervention: ${JSON.stringify(order)}`);
    return res.status(200).json({ message: "Order reverted", order });
});

app.listen(4000, () => {
    console.log("Business API listening on port 4000");
    console.log("Metrics available at http://localhost:4000/metrics");
    if (withError) {
        console.log("Running in error simulation mode (--with-error).");
    }
    console.log(
        `Consumer service notifications will be sent to port ${CONSUMER_SERVICE_PORT}`,
    );
    console.log(`Configuration: ${JSON.stringify(config)}`);

    // Initialize metrics with starting values
    metrics.pendingOrdersGauge.set(0);
    metrics.errorOrdersGauge.set(0);
});
