#!/bin/sh
# docker-api-entrypoint.sh
# Entry point script for API Docker containers

# Display environment info
echo "Node version: $(node -v)"
echo "Working directory: $(pwd)"

# Function to run the fallback server as a last resort
run_fallback() {
  echo "All other options failed. Running pure CommonJS fallback server..."
  pnpm agent-api-fallback
}

# Check for compiled files
if [ -f /app/dist/api/server.js ]; then
  echo "Using compiled JS files (production mode)"
  pnpm agent-api-prod || run_fallback
else
  echo "Compiled JS files not found, falling back to development mode"
  echo "Available files in src/api:"
  ls -la /app/src/api
  
  # Try to build again
  echo "Attempting to rebuild API files..."
  sh build-api-no-check.sh
  
  # Check if build succeeded
  if [ -f /app/dist/api/server.js ]; then
    echo "Rebuild successful, using compiled JS files"
    pnpm agent-api-prod || run_fallback
  else
    echo "Rebuild failed, running with wrapper script"
    pnpm agent-api-wrapper || run_fallback
  fi
fi
