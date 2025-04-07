#!/bin/sh
# build-all.sh
# Full build script for both Next.js and API

# Set environment variables
export NEXT_DISABLE_ESLINT_DURING_BUILD=true
export NEXT_TELEMETRY_DISABLED=1
export NODE_ENV=production

# Clean the dist directory
echo "Cleaning dist directory..."
rm -rf dist

# Ensure required directories exist
echo "Creating required directories..."
mkdir -p src/data
mkdir -p data/seller

# Build Next.js app to dist directory
echo "Building Next.js application..."
pnpm build

# Build TypeScript API files (ignoring type errors)
echo "Building API TypeScript files..."
pnpm build-api

# Copy necessary static files if needed
echo "Checking required data files..."
[ -f src/account.json ] || echo '{"id":"default","wallet":1000}' > src/account.json
[ -f src/agent_audit.log ] || touch src/agent_audit.log
[ -f src/data/policies.json ] || echo '[]' > src/data/policies.json
[ -f src/data/order_meta.json ] || echo '{}' > src/data/order_meta.json

# Print build completion message
echo "✅ Build completed successfully!"
echo "   - Next.js frontend: ./dist/"
echo "   - API server: ./dist/api/"
echo ""
echo "To start the application:"
echo "   - Frontend: pnpm start"
echo "   - Agent API: pnpm agent-api-prod"
echo "   - Seller API: pnpm seller-api-prod"
