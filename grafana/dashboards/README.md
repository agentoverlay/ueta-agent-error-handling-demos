# UETA Grafana Dashboards

This directory contains Grafana dashboards for monitoring the UETA system.

## Available Dashboards

1. **ueta-dashboard.json** - Original monitoring dashboard with basic metrics
2. **seller-dashboard.json** - Dashboard focused on seller metrics:
   - Order volumes and status
   - Pending approvals
   - Total sales value
   - Order processing times
   - Approval/rejection rates

3. **agent-dashboard.json** - Dashboard focused on agent metrics:
   - Wallet balance
   - Orders placed
   - Pending approvals
   - Order errors
   - Agent activity
   - API response times

4. **all-metrics-dashboard.json** - Comprehensive dashboard combining metrics from both seller and agent:
   - Global overview
   - Order velocity
   - Pending approvals across systems
   - Total value pending approval
   - Human intervention metrics
   - System performance

## Metrics Implementation

The dashboards rely on Prometheus metrics exported by the API servers. Key metrics include:

### Seller Metrics
- `ueta_seller_orders_total` - Count of orders by status
- `ueta_seller_pending_orders` - Number of pending orders
- `ueta_seller_order_value_total` - Total value of all orders
- `ueta_seller_order_value_pending` - Value of pending orders
- `ueta_seller_approvals_total` - Count of approved orders
- `ueta_seller_rejections_total` - Count of rejected orders

### Agent Metrics
- `ueta_agent_wallet_balance` - Current agent wallet balance
- `ueta_agent_orders_placed_total` - Total orders placed by agent
- `ueta_agent_pending_approvals` - Orders pending approval
- `ueta_agent_pending_approval_value` - Value of orders pending approval
- `ueta_agent_order_response_time_seconds` - API response times

### Human Intervention Metrics
- `ueta_human_pending_review` - Number of orders pending human review
- `ueta_human_approvals_total` - Total human approvals
- `ueta_human_reverts_total` - Total human reverts
- `ueta_human_approval_duration_seconds` - Time taken for approval

## Usage

These dashboards are automatically provisioned by Grafana. You can access them at:

```
http://localhost:3000/dashboards
```

The dashboards refresh automatically every 5 seconds to show real-time metrics.
