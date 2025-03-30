#!/bin/bash

# Set default environment variables for local development
export SELLER_URL="${SELLER_URL:-http://localhost:4000}"
export HUMAN_URL="${HUMAN_URL:-http://localhost:5002}"

# Check if an account exists
if [ ! -f "account.json" ]; then
    echo "No account found. Creating one..."
    ./scripts/create-account.sh
fi

# Start the agent in autonomous mode
echo "Starting agent in autonomous mode..."
echo "Using seller at: $SELLER_URL"
echo "Using human service at: $HUMAN_URL"

pnpm run start:agent agent
