#!/bin/bash

# Set default environment variables for local development
export SELLER_URL="${SELLER_URL:-http://localhost:4000}"
export HUMAN_URL="${HUMAN_URL:-http://localhost:5002}"

# Create an account with default deposit of 500
pnpm run start:agent create-account -- --deposit 500

echo "Account created with deposit of 500"
echo "Using seller at: $SELLER_URL"
echo "Using human service at: $HUMAN_URL"
