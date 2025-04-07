// seller-server.cjs - CommonJS version of the Seller API server
const express = require("express");
const cors = require("cors");
const { v4: uuid } = require("uuid");

console.log("Starting Seller API server in fallback CommonJS mode");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic routes
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "seller", mode: "cjs-fallback" });
});

// List products
app.get("/products", (req, res) => {
  res.json([
    { sku: "FALLBACK1", description: "Fallback Product 1", price: 9.99 },
    { sku: "FALLBACK2", description: "Fallback Product 2", price: 19.99 },
    { sku: "FALLBACK3", description: "Fallback Product 3", price: 29.99 }
  ]);
});

// Place an order
app.post("/order", (req, res) => {
  const { sku, quantity, accountId } = req.body;
  
  const order = {
    id: uuid(),
    accountId,
    sku,
    quantity,
    totalPrice: 9.99 * quantity,
    orderDate: new Date(),
    status: "delivered"
  };
  
  res.status(201).json(order);
});

// Get pending orders
app.get("/pending", (req, res) => {
  res.json([]);
});

// Get stats
app.get("/stats", (req, res) => {
  res.json({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    errorOrders: 0
  });
});

// Get metrics
app.get("/metrics", (req, res) => {
  res.type('text').send("# Fallback metrics\nseller_health_status 1\n");
});

// Start the server
const PORT = process.env.SELLER_PORT || 4000;
app.listen(PORT, () => {
  console.log(`FALLBACK: Seller API server running on port ${PORT} in CommonJS mode`);
});
