# Setting up Grafana for UETA Monitoring

This guide provides detailed instructions for setting up Grafana with the UETA Monitoring Dashboard.

## Prerequisites

- Docker and Docker Compose installed
- UETA Agent Demos repository cloned

## Quick Start

1. Make sure the permission is set correctly:

```bash
chmod +x scripts/setup-grafana.sh
```

2. Run the setup script:

```bash
./scripts/setup-grafana.sh
```

3. Start the services:

```bash
docker-compose up -d
```

4. Access Grafana at http://localhost:3000 (login with admin/admin)

5. Navigate to Dashboards → UETA → UETA Monitoring Dashboard

## Manual Dashboard Setup

If the automatic provisioning doesn't work, you can manually import the dashboard:

1. Access Grafana at http://localhost:3000
2. Login with admin/admin
3. Click the "+" icon on the left sidebar
4. Select "Import"
5. Click "Upload JSON file"
6. Select the file at `grafana/dashboards/ueta-dashboard.json`
7. Select the Prometheus data source
8. Click "Import"

## Dashboard Features

The UETA Monitoring Dashboard provides comprehensive visibility into your UETA system:

### Overview Section
- Total Orders
- Agent Wallet Balance
- Total Errors
- Pending Orders

### Orders & Transactions Section
- Orders by Status (graphed over time)
- Order Rate by Status (orders per minute)
- Order Processing Time (average time to process an order)
- Agent Wallet Balance History

### Human Intervention Section
- Human Intervention Metrics (pending reviews, approvals, reverts)
- Human Approval Time (median and 95th percentile)

### Agent & Performance Section
- Agent Activity (orders placed, errors, attempts)
- Agent API Response Time (median and 95th percentile)

## Troubleshooting

If you encounter issues with the dashboard:

### Dashboard Not Appearing
- Check that the provisioning configuration is correct:
  ```bash
  cat grafana/provisioning/dashboards/dashboards.yml
  ```
- Verify the dashboard JSON file exists:
  ```bash
  ls -la grafana/dashboards/
  ```
- Check Grafana logs:
  ```bash
  docker-compose logs grafana
  ```

### No Data in Dashboard
- Check that Prometheus is scraping metrics correctly:
  ```bash
  curl http://localhost:9090/api/v1/targets
  ```
- Verify the services are exposing metrics:
  ```bash
  curl http://localhost:4000/metrics  # Seller
  curl http://localhost:5002/metrics  # Human
  curl http://localhost:7001/metrics  # Agent
  ```
- Generate some test data:
  ```bash
  ./scripts/test-order-flow.sh
  ```

### Permission Issues
If you encounter permission issues with the dashboard files:
```bash
sudo chown -R 472:472 grafana/dashboards/
```
(472 is the Grafana user ID in the container)

## Customizing the Dashboard

You can customize the dashboard directly in the Grafana UI:

1. Click the gear icon while viewing the dashboard
2. Make your changes
3. Click "Save"
4. To export your changes for version control:
   - Click the Share icon (next to the gear)
   - Select the "Export" tab
   - Click "Save to file"
   - Replace the original JSON file with your exported version
