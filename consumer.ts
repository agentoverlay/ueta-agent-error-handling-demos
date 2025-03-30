import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import { config } from "./config";
import * as metrics from "./metrics/consumer_metrics";

// Seller service URL determined by environment variable
const SELLER_URL = process.env.SELLER_URL || "http://seller:4000";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let flaggedOrders: any[] = [];

// Expose metrics endpoint
app.get("/metrics", async (req, res) => {
    res.set("Content-Type", metrics.register.contentType);
    res.end(await metrics.register.metrics());
});

// Helper for consumer-side audit logging.
function consumerAuditLog(message: string) {
    const logLine = `${new Date().toISOString()} - ${message}`;
    fs.appendFileSync("consumer_audit.log", logLine + "\n");
    if (config.monitoringEnabled) {
        console.log(`[CONSUMER MONITOR] ${logLine}`);
    }
}

// Endpoint for the business API to flag an order.
app.post("/flag", (req, res) => {
    const flaggedOrder = req.body;
    if (!flaggedOrder || !flaggedOrder.id) {
        return res.status(400).json({ error: "Invalid flagged order payload" });
    }
    // Replace any existing order with the same ID.
    flaggedOrders = flaggedOrders.filter((o) => o.id !== flaggedOrder.id);
    flaggedOrders.push(flaggedOrder);
    
    // Update metrics
    metrics.flaggedOrdersCounter.inc({ status: flaggedOrder.status });
    metrics.pendingReviewGauge.set(flaggedOrders.length);
    
    consumerAuditLog(`Order flagged: ${JSON.stringify(flaggedOrder)}`);
    res.status(200).json({ message: "Flag received", order: flaggedOrder });
});

// Endpoint to revert a flagged order.
app.post("/revert", async (req, res) => {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: "orderId is required" });
    try {
        // Find the flagged order to get the timestamp for duration calculation
        const flaggedOrder = flaggedOrders.find(o => o.id === orderId);
        const flagTime = flaggedOrder ? new Date(flaggedOrder.orderDate).getTime() : Date.now();
        const currentTime = Date.now();
        const durationInSeconds = (currentTime - flagTime) / 1000;
        
        const response = await fetch(`${SELLER_URL}/revert`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            consumerAuditLog(
                `Failed to revert order ${orderId}: ${JSON.stringify(
                    errorData,
                )}`,
            );
            return res.status(response.status).json(errorData);
        }
        
        // Update metrics
        metrics.revertCounter.inc();
        metrics.pendingReviewGauge.dec();
        metrics.approvalDurationHistogram.observe(durationInSeconds);
        
        const result = await response.json();
        consumerAuditLog(`Order reverted: ${JSON.stringify(result.order)}`);
        flaggedOrders = flaggedOrders.filter((o) => o.id !== orderId);
        res.status(200).json({
            message: "Order reverted",
            order: result.order,
        });
    } catch (err) {
        consumerAuditLog(`Error reverting order ${orderId}: ${err}`);
        res.status(500).json({ error: "Error reverting order" });
    }
});

// Endpoint to approve a pending order.
app.post("/approve", async (req, res) => {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: "orderId is required" });
    try {
        // Find the flagged order to get the timestamp for duration calculation
        const flaggedOrder = flaggedOrders.find(o => o.id === orderId);
        const flagTime = flaggedOrder ? new Date(flaggedOrder.orderDate).getTime() : Date.now();
        const currentTime = Date.now();
        const durationInSeconds = (currentTime - flagTime) / 1000;
        
        const response = await fetch(`${SELLER_URL}/approve`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            consumerAuditLog(
                `Failed to approve order ${orderId}: ${JSON.stringify(
                    errorData,
                )}`,
            );
            return res.status(response.status).json(errorData);
        }
        
        // Update metrics
        metrics.approvalCounter.inc();
        metrics.pendingReviewGauge.dec();
        metrics.approvalDurationHistogram.observe(durationInSeconds);
        
        const result = await response.json();
        consumerAuditLog(`Order approved: ${JSON.stringify(result.order)}`);
        flaggedOrders = flaggedOrders.filter((o) => o.id !== orderId);
        res.status(200).json({
            message: "Order approved",
            order: result.order,
        });
    } catch (err) {
        consumerAuditLog(`Error approving order ${orderId}: ${err}`);
        res.status(500).json({ error: "Error approving order" });
    }
});

// Dashboard for consumer intervention.
app.get("/dashboard", (req, res) => {
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Consumer Intervention Dashboard</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { text-align: left; padding: 8px; border: 1px solid #ddd; }
        tr:nth-child(even){ background-color: #f2f2f2; }
        th { background-color: #4CAF50; color: white; }
        button { padding: 5px 10px; }
      </style>
    </head>
    <body>
      <h1>Consumer Intervention Dashboard</h1>
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Account ID</th>
            <th>SKU</th>
            <th>Quantity</th>
            <th>Total Price</th>
            <th>Status</th>
            <th>Error</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
  `;
    if (flaggedOrders.length === 0) {
        html += `<tr><td colspan="8" style="text-align:center;">No flagged orders</td></tr>`;
    } else {
        flaggedOrders.forEach((order) => {
            html += `<tr id="row-${order.id}">
                <td>${order.id}</td>
                <td>${order.accountId}</td>
                <td>${order.sku}</td>
                <td>${order.quantity}</td>
                <td>${order.totalPrice}</td>
                <td>${order.status}</td>
                <td>${order.error || ""}</td>
                <td>`;
            if (order.status === "pending_confirmation") {
                html += `<button onclick="approveOrder('${order.id}')">Approve</button>`;
            } else if (order.status === "error") {
                html += `<button onclick="revertOrder('${order.id}')">Revert</button>`;
            } else {
                html += `N/A`;
            }
            html += `</td></tr>`;
        });
    }
    html += `
        </tbody>
      </table>
      <script>
        // Using seller URL from environment variable
        const sellerUrl = '${SELLER_URL}';
        
        async function approveOrder(orderId) {
          if (!confirm('Are you sure you want to approve order ' + orderId + '?')) return;
          try {
            const response = await fetch('/approve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId })
            });
            const result = await response.json();
            if (response.ok) {
              alert('Order approved successfully.');
              const row = document.getElementById('row-' + orderId);
              if (row) row.remove();
            } else {
              alert('Error: ' + JSON.stringify(result));
            }
          } catch (err) {
            alert('Error approving order: ' + err);
          }
        }

        async function revertOrder(orderId) {
          if (!confirm('Are you sure you want to revert order ' + orderId + '?')) return;
          try {
            const response = await fetch('/revert', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ orderId })
            });
            const result = await response.json();
            if (response.ok) {
              alert('Order reverted successfully.');
              const row = document.getElementById('row-' + orderId);
              if (row) row.remove();
            } else {
              alert('Error: ' + JSON.stringify(result));
            }
          } catch (err) {
            alert('Error reverting order: ' + err);
          }
        }
      </script>
    </body>
    </html>
  `;
    res.send(html);
});

// Use environment variable for the consumer service port (default 5002).
const PORT = process.env.CONSUMER_PORT ? parseInt(process.env.CONSUMER_PORT) : 5002;
app.listen(PORT, () => {
    console.log(`Consumer service listening on port ${PORT}`);
    console.log(`Metrics available at http://localhost:${PORT}/metrics`);
    console.log(`Using seller service at: ${SELLER_URL}`);
    
    // Initialize metrics with starting values
    metrics.pendingReviewGauge.set(flaggedOrders.length);
});
