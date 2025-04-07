#!/bin/sh
# run-local.sh - Script to run the services locally with correct URLs

# Set environment variables for local development
export SELLER_URL="http://localhost:4000"
export CONSUMER_URL="http://localhost:5002"

# Function to run a command in a new terminal window (Mac specific)
run_in_new_terminal() {
  osascript -e "tell application \"Terminal\" to do script \"cd $(pwd) && $1\""
}

# Ask which services to start
echo "Which services would you like to start?"
echo "1) All services"
echo "2) Agent API only"
echo "3) Seller API only"
echo "4) Frontend only"

read -p "Enter your choice (1-4): " choice

case $choice in
  1)
    # Start all services
    run_in_new_terminal "SELLER_URL=http://localhost:4000 pnpm seller-api"
    sleep 2
    run_in_new_terminal "SELLER_URL=http://localhost:4000 pnpm agent-api"
    sleep 2
    run_in_new_terminal "NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm dev"
    ;;
  2)
    # Start Agent API only
    SELLER_URL=http://localhost:4000 pnpm agent-api
    ;;
  3)
    # Start Seller API only
    pnpm seller-api
    ;;
  4)
    # Start Frontend only
    NEXT_PUBLIC_API_URL=http://localhost:3001 pnpm dev
    ;;
  *)
    echo "Invalid choice"
    ;;
esac
