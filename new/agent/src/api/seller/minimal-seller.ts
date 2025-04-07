// src/api/seller/minimal-seller.ts
import express from "express";
import cors from "cors";

// Setup Express server
const app = express();
app.use(cors());
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check
app.get("/health", (req, res) => {
  console.log("Health endpoint called");
  res.json({ status: "ok", service: "minimal seller" });
});

// Stats endpoint
app.get("/stats", (req, res) => {
  console.log("Stats endpoint called");
  const stats = {
    totalOrders: 5,
    totalRevenue: 100.50,
    pendingOrders: 2,
    errorOrders: 1
  };
  console.log("Returning stats:", stats);
  res.json(stats);
});

// Products endpoint
app.get("/products", (req, res) => {
  const products = [
    { sku: "APPLES", description: "Fresh Red Apples (1 lb)", price: 2.99 },
    { sku: "BANANAS", description: "Organic Bananas (bunch)", price: 1.49 },
    { sku: "MILK", description: "Whole Milk (1 gallon)", price: 3.75 }
  ];
  res.json(products);
});

// Orders endpoint
app.get("/orders", (req, res) => {
  const orders = [
    {
      id: "order1",
      accountId: "account1",
      sku: "APPLES",
      quantity: 2,
      totalPrice: 5.98,
      orderDate: new Date(),
      status: "delivered"
    },
    {
      id: "order2",
      accountId: "account1",
      sku: "MILK",
      quantity: 1,
      totalPrice: 3.75,
      orderDate: new Date(),
      status: "pending_confirmation"
    }
  ];
  res.json(orders);
});

// Start server
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Minimal seller service running on port ${PORT}`);
  console.log(`Health endpoint: http://localhost:${PORT}/health`);
  console.log(`Stats endpoint: http://localhost:${PORT}/stats`);
});
