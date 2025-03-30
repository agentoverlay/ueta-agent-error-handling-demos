# UETA Agent Demos - Prometheus Monitoring

This directory contains Prometheus configuration for monitoring the UETA Agent Demos services.

## Metrics Overview

The monitoring system captures metrics from all components:

### Seller Service Metrics:
- `ueta_seller_orders_total` - Total number of orders received (labeled by status)
- `ueta_seller_order_processing_duration_seconds` - Duration of order processing
- `ueta_seller_pending_orders` - Number of orders pending confirmation
- `ueta_seller_error_orders` - Number of orders in error state
- `ueta_seller_order_value` - Summary of order values

### Human Service Metrics:
- `ueta_human_flagged_orders_total` - Total number of orders flagged for human review
- `ueta_human_approvals_total` - Total number of orders approved by human
- `ueta_human_reverts_total` - Total number of orders reverted by human
- `ueta_human_pending_review` - Number of orders pending human review
- `ueta_human_approval_duration_seconds` - Duration between flagging and approval/revert

### Agent Metrics:
- `ueta_agent_orders_placed_total` - Total number of orders placed by agent
- `ueta_agent_order_errors_total` - Total number of order errors encountered by agent
- `ueta_agent_wallet_balance` - Current wallet balance of the agent
- `ueta_agent_order_attempts_total` - Total number of order attempts by agent
- `ueta_agent_order_response_time_seconds` - Response time for agent order requests

## Accessing Metrics

Each service exposes metrics at:
- Seller: http://seller:4000/metrics
- Human: http://human:5002/metrics
- Agent: http://agent:7001/metrics
- Agent Dashboard: http://agent-dashboard:6001/metrics

## Using with Grafana

The metrics can be visualized in Grafana, which is included in the Docker Compose setup. You can access Grafana at http://localhost:3000 with default credentials:
- Username: admin
- Password: admin

A pre-configured dashboard is available with visualizations for:
- Order flow and statuses
- Error rates and approvals
- Response times and durations
- Agent wallet balance

For detailed setup and troubleshooting instructions, see the [Grafana Setup Guide](../GRAFANA-SETUP.md).

## Manual Testing

To manually trigger metrics for testing the monitoring system:
1. Create an account: `./scripts/create-account.sh`
2. Place orders: `./scripts/test-order-flow.sh`
3. Start autonomous agent: `./scripts/start-agent-auto.sh`
