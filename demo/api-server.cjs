// api-server.cjs - CommonJS version of the API server
const express = require("express");
const cors = require("cors");
const { v4: uuid } = require("uuid");

console.log("Starting Agent API server in fallback CommonJS mode");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: "cjs-fallback" });
});

app.get("/api/products", (req, res) => {
  // Provide basic product list
  res.json([
    { sku: "FALLBACK1", description: "Fallback Product 1", price: 9.99 },
    { sku: "FALLBACK2", description: "Fallback Product 2", price: 19.99 },
    { sku: "FALLBACK3", description: "Fallback Product 3", price: 29.99 }
  ]);
});

app.get("/api/account", (req, res) => {
  // Create a default account
  const account = {
    id: uuid(),
    wallet: 1000,
  };
  
  res.json(account);
});

// Get metrics
app.get("/metrics", (req, res) => {
  res.type('text').send("# Fallback metrics\napi_health_status 1\n");
});

// Start the server
const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`FALLBACK: Agent API server running on port ${PORT} in CommonJS mode`);
});
