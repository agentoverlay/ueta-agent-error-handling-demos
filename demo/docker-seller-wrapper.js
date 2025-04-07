// docker-seller-wrapper.js
// CommonJS wrapper to execute the Seller API server in TypeScript mode

console.log("Starting Seller API server in development mode (TypeScript)");

try {
  // Use tsx to execute the TypeScript file directly
  require("tsx").run("./src/api/seller/seller.ts");
} catch (error) {
  console.error("Failed to start Seller API server with tsx:", error.message);
  console.error("Trying alternative approach...");
  
  try {
    // Manually require necessary modules and create a simple API server
    const express = require("express");
    const cors = require("cors");
    
    const app = express();
    app.use(cors());
    app.use(express.json());
    
    app.get("/health", (req, res) => {
      res.json({ status: "ok", service: "seller", mode: "fallback" });
    });
    
    app.get("/products", (req, res) => {
      res.json([
        { sku: "FALLBACK1", description: "Fallback Product 1", price: 9.99 },
        { sku: "FALLBACK2", description: "Fallback Product 2", price: 19.99 }
      ]);
    });
    
    const PORT = process.env.SELLER_PORT || 4000;
    app.listen(PORT, () => {
      console.log(`FALLBACK: Seller API server running on port ${PORT}`);
    });
  } catch (secondError) {
    console.error("Critical failure - could not start Seller API server:", secondError.message);
    process.exit(1);
  }
}
