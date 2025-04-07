// src/api/seller-api.ts
import express from "express";
import { env } from "../lib/env";
import fetch from "node-fetch";

// Create a router for seller API endpoints
const sellerApiRouter = express.Router();

// Forward API calls to the seller service
const SELLER_SERVICE_URL = process.env.SELLER_URL || env.SELLER_URL || "http://localhost:4000";
console.log("[SELLER-API] Using seller service URL:", SELLER_SERVICE_URL);

// Helper to forward requests to the seller service
async function forwardToSellerService(req: express.Request, res: express.Response, path: string, method = "GET") {
  try {
    const url = `${SELLER_SERVICE_URL}${path}`;
    console.log(`Forwarding ${method} request to seller service: ${url}`);
    
    const fetchOptions: any = {
      method,
      headers: {
        "Content-Type": "application/json",
      }
    };
    
    // Add body for non-GET requests
    if (method !== "GET" && Object.keys(req.body).length > 0) {
      fetchOptions.body = JSON.stringify(req.body);
    }
    
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    
    // Forward the status code and response from the seller service
    res.status(response.status).json(data);
  } catch (error) {
    console.error(`Error forwarding to seller service at ${path}:`, error);
    res.status(500).json({ 
      error: `Error connecting to seller service: ${error}` 
    });
  }
}

// Health check
sellerApiRouter.get("/health", async (req, res) => {
  await forwardToSellerService(req, res, "/health");
});

// Get products
sellerApiRouter.get("/products", async (req, res) => {
  await forwardToSellerService(req, res, "/products");
});

// Create a product
sellerApiRouter.post("/products", async (req, res) => {
  await forwardToSellerService(req, res, "/products", "POST");
});

// Update a product
sellerApiRouter.put("/products/:sku", async (req, res) => {
  await forwardToSellerService(req, res, `/products/${req.params.sku}`, "PUT");
});

// Delete a product
sellerApiRouter.delete("/products/:sku", async (req, res) => {
  await forwardToSellerService(req, res, `/products/${req.params.sku}`, "DELETE");
});

// Get all orders
sellerApiRouter.get("/orders", async (req, res) => {
  await forwardToSellerService(req, res, "/orders");
});

// Get orders by status
sellerApiRouter.get("/orders/:status", async (req, res) => {
  await forwardToSellerService(req, res, `/orders/${req.params.status}`);
});

// Get pending orders
sellerApiRouter.get("/pending", async (req, res) => {
  await forwardToSellerService(req, res, "/pending");
});

// Place an order
sellerApiRouter.post("/order", async (req, res) => {
  await forwardToSellerService(req, res, "/order", "POST");
});

// Approve an order
sellerApiRouter.post("/approve", async (req, res) => {
  await forwardToSellerService(req, res, "/approve", "POST");
});

// Reject/revert an order
sellerApiRouter.post("/reject", async (req, res) => {
  await forwardToSellerService(req, res, "/reject", "POST");
});

// Get seller statistics
sellerApiRouter.get("/stats", async (req, res) => {
  try {
    const response = await fetch(`${SELLER_SERVICE_URL}/stats`);
    if (!response.ok) {
      console.error(`Error fetching stats: ${response.status}`);
      return res.status(response.status).json({ error: "Error fetching stats." });
    }
    
    const statsData = await response.json();
    
    // Map the seller stats format to the format expected by the frontend
    const stats = {
      totalOrders: statsData.totalOrders || 0,
      totalRevenue: statsData.totalAmountPaid || 0,
      pendingOrders: 0,
      errorOrders: 0
    };
    
    // Get pending and error orders count
    try {
      const pendingResponse = await fetch(`${SELLER_SERVICE_URL}/pending`);
      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();
        stats.pendingOrders = pendingData.length || 0;
      }
      
      const ordersResponse = await fetch(`${SELLER_SERVICE_URL}/orders`);
      if (ordersResponse.ok) {
        const ordersData = await ordersResponse.json();
        stats.errorOrders = ordersData.filter((o: any) => o.status === 'error').length || 0;
      }
    } catch (err) {
      console.error('Error fetching additional stats:', err);
    }
    
    return res.json(stats);
  } catch (error) {
    console.error(`Error connecting to seller service for stats: ${error}`);
    return res.status(500).json({ error: `Error connecting to seller service: ${error}` });
  }
});

// Get seller policies
sellerApiRouter.get("/policies", async (req, res) => {
  await forwardToSellerService(req, res, "/policies");
});

// Create a seller policy
sellerApiRouter.post("/policies", async (req, res) => {
  await forwardToSellerService(req, res, "/policies", "POST");
});

// Update a seller policy
sellerApiRouter.put("/policies/:id", async (req, res) => {
  await forwardToSellerService(req, res, `/policies/${req.params.id}`, "PUT");
});

// Delete a seller policy
sellerApiRouter.delete("/policies/:id", async (req, res) => {
  await forwardToSellerService(req, res, `/policies/${req.params.id}`, "DELETE");
});

export { sellerApiRouter };
