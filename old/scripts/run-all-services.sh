#!/bin/bash

# Setup Grafana dashboard
echo "Setting up Grafana dashboard..."
./scripts/setup-grafana.sh

# Start all services with docker-compose
echo "Starting all services with Docker Compose..."
docker-compose up -d

echo ""
echo "Services are now running:"
echo "- Seller API: http://localhost:4000"
echo "- Human Dashboard: http://localhost:5002/dashboard"
echo "- Agent Dashboard: http://localhost:6001/dashboard"
echo "- Prometheus: http://localhost:9090"
echo "- Grafana: http://localhost:3000 (admin/admin)"
echo ""
echo "To see the logs, run: docker-compose logs -f"
echo "To stop all services, run: docker-compose down"
