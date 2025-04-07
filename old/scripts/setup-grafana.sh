#!/bin/bash

# This script ensures the UETA dashboard is properly set up in Grafana

# Create necessary directories if they don't exist
mkdir -p ./grafana/dashboards

# Copy the dashboard JSON to the correct location
cp ./grafana/dashboards/ueta-dashboard.json ./grafana/dashboards/ueta-dashboard.json

# Make the dashboard executable for Grafana
chmod 644 ./grafana/dashboards/ueta-dashboard.json

echo "Grafana dashboard setup complete."
echo "After starting services with docker-compose, access Grafana at: http://localhost:3000"
echo "Login with admin/admin and look for the UETA Monitoring Dashboard"
