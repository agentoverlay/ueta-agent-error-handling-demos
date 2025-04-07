#!/bin/bash

# Set default environment variables for local development
export SELLER_URL="${SELLER_URL:-http://localhost:4000}"
export HUMAN_URL="${HUMAN_URL:-http://localhost:5002}"

# Check if an account exists
if [ ! -f "account.json" ]; then
    echo "No account found. Creating one..."
    ./scripts/create-account.sh
fi

# List available products
echo "Listing available products..."
pnpm run start:agent list-products

# Place an order
echo "Placing an order for SKU001, quantity 2..."
pnpm run start:agent order -- --sku SKU001 --quantity 2 --agent

echo "Order placed. Check the human dashboard at $HUMAN_URL/dashboard to see if it needs approval."
