// docker-api-wrapper.js
// CommonJS wrapper to execute the API server in TypeScript mode

console.log("Starting Agent API server in development mode (TypeScript)");

try {
  // Use tsx to execute the TypeScript file directly
  require("tsx").run("./src/api/server.ts");
} catch (error) {
  console.error("Failed to start API server with tsx:", error.message);
  console.error("Trying alternative approach...");
  
  try {
    // Manually require necessary modules and create a simple API server
    const express = require("express");
    const cors = require("cors");
    
    const app = express();
    app.use(cors());
    app.use(express.json());
    
    app.get("/api/health", (req, res) => {
      res.json({ status: "ok", mode: "fallback" });
    });
    
    const PORT = process.env.API_PORT || 3001;
    app.listen(PORT, () => {
      console.log(`FALLBACK: Agent API server running on port ${PORT}`);
    });
  } catch (secondError) {
    console.error("Critical failure - could not start API server:", secondError.message);
    process.exit(1);
  }
}
