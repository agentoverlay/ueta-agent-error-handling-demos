# UETA Agent Demos - Monitoring with Prometheus and Grafana

This document provides instructions for setting up and using the monitoring system for the UETA Agent Demos.

## Overview

We've added Prometheus metrics and Grafana dashboards to monitor the transaction flow and error handling in the UETA Agent Demos. This monitoring setup helps visualize:

- Order counts by status (received, pending, delivered, error, reverted)
- Error rates and response times
- Human approval/revert activities
- Agent wallet balance
- System performance metrics

## Setup

### Prerequisites

- Docker and Docker Compose installed
- Git repository cloned

### Starting the Monitoring System

1. Make all scripts executable:
   ```bash
   chmod +x scripts/*.sh
   ```

2. Start all services including monitoring:
   ```bash
   ./scripts/run-all-services.sh
   ```

3. Create an account (if needed):
   ```bash
   ./scripts/create-account.sh
   ```

4. Access the monitoring interfaces:
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3000 (login with admin/admin)
   - Pre-configured UETA dashboard will be available at: http://localhost:3000/d/ueta-monitoring/ueta-monitoring-dashboard

## Using the Monitoring System

### Viewing Metrics in Prometheus

1. Open Prometheus at http://localhost:9090
2. Go to "Graph" and search for metrics with prefix `ueta_`
3. Example queries:
   - `sum(ueta_seller_orders_total) by (status)` - Order counts by status
   - `rate(ueta_seller_orders_total[5m])` - Order rate in the last 5 minutes
   - `ueta_agent_wallet_balance` - Current agent wallet balance

### Using Grafana Dashboards

1. Open Grafana at http://localhost:3000 (login with admin/admin)
2. Navigate to Dashboards > UETA > "UETA Monitoring Dashboard"
3. The dashboard provides visualizations for:
   - Order flow with status breakdowns
   - Error rates and approvals
   - Response times for order processing
   - Agent wallet balance trends

## Testing the Monitoring

To generate metrics for testing the monitoring system:

1. Generate test data for the dashboard:
   ```bash
   chmod +x scripts/generate-dashboard-data.sh
   ./scripts/generate-dashboard-data.sh
   ```

2. Or place a few test orders manually:
   ```bash
   ./scripts/test-order-flow.sh
   ```

3. Start the agent in autonomous mode to continuously generate orders:
   ```bash
   ./scripts/start-agent-auto.sh
   ```

3. Observe the metrics flowing in Prometheus and Grafana

## Troubleshooting

If you encounter issues with the monitoring:

1. Check service connectivity:
   ```bash
   docker-compose ps
   ```

2. View logs for specific services:
   ```bash
   docker-compose logs prometheus
   docker-compose logs grafana
   ```

3. Verify metrics endpoints are accessible:
   ```bash
   curl http://localhost:4000/metrics  # Seller
   curl http://localhost:5002/metrics  # Human
   curl http://localhost:7001/metrics  # Agent
   ```

4. If a service isn't reporting metrics, you can restart it:
   ```bash
   docker-compose restart <service_name>
   ```

## Customizing the Monitoring

- **Adding New Metrics**: Add new metrics to the respective metrics files in the `metrics/` directory.
- **Customizing Dashboards**: Modify the dashboard JSON files in the `grafana/dashboards/` directory.
- **Changing Scrape Intervals**: Edit `prometheus/prometheus.yml` to adjust how frequently metrics are collected.
