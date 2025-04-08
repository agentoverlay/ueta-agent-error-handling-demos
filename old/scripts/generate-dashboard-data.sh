#!/bin/bash

# Script to generate test data for Grafana dashboard visualization

echo "Generating test data for UETA Metrics Dashboard..."

# Set default environment variables
export SELLER_URL="${SELLER_URL:-http://localhost:4000}"
export HUMAN_URL="${HUMAN_URL:-http://localhost:5002}"

# Check if an account exists, create one if not
if [ ! -f "account.json" ]; then
    echo "Creating an account..."
    ./scripts/create-account.sh
fi

# Function to place an order and capture response
place_order() {
    local sku=$1
    local quantity=$2
    local as_agent=$3
    
    if [ "$as_agent" = true ]; then
        echo "Placing agent order for SKU: $sku, Quantity: $quantity"
        pnpm run start:agent order -- --sku "$sku" --quantity "$quantity" --agent
    else
        echo "Placing user order for SKU: $sku, Quantity: $quantity"
        pnpm run start:agent order -- --sku "$sku" --quantity "$quantity"
    fi
    
    # Sleep briefly between orders
    sleep 1
}

# Place a series of orders with varying parameters to generate metrics
echo "Placing a series of test orders..."

# Normal orders
place_order "SKU001" 1 false
place_order "SKU002" 2 false
place_order "SKU003" 1 false

# Agent orders
place_order "SKU001" 3 true
place_order "SKU002" 1 true
place_order "SKU003" 2 true

# Check if the human service is running and has a dashboard
if curl -s "$HUMAN_URL/dashboard" > /dev/null; then
    echo "Human service dashboard is available at: $HUMAN_URL/dashboard"
    echo "You may need to manually approve some pending orders to generate approval metrics"
else
    echo "Warning: Human service doesn't appear to be running at $HUMAN_URL"
fi

echo "Test data generation complete."
echo "Wait a few minutes for the data to appear in your Grafana dashboard at: http://localhost:3000"
