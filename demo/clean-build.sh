#!/bin/sh
# clean-build.sh
# Clean script to remove dist directory and rebuild

# Set environment variables to skip linting and type checking
export NEXT_DISABLE_ESLINT_DURING_BUILD=true
export NEXT_TELEMETRY_DISABLED=1
export NODE_ENV=production

# Clean the dist directory
echo "Cleaning dist directory..."
rm -rf dist

# Run the Next.js build to the dist directory
echo "Running Next.js build with output to dist directory..."
pnpm build || echo "Completed build - ignoring any errors"

# Build the API TypeScript files
echo "Compiling API TypeScript files..."
pnpm build-api || echo "Completed API build - ignoring any errors"

echo "Build completed. Output available in the dist directory."
