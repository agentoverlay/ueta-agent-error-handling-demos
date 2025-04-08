#!/bin/bash

# Ensure account.json exists for the old agent
if [ ! -f "account.json" ]; then
  echo "{}" > account.json
  echo "Created empty account.json file"
fi

# Ensure agent_audit.log exists for the old agent
if [ ! -f "agent_audit.log" ]; then
  touch agent_audit.log
  echo "Created empty agent_audit.log file"
fi

# Ensure directory exists for new agent
mkdir -p new/agent

# Ensure account.json exists for the new agent
if [ ! -f "new/agent/account.json" ]; then
  echo "{}" > new/agent/account.json
  echo "Created empty account.json file for new agent"
fi

# Ensure agent_audit.log exists for the new agent
if [ ! -f "new/agent/agent_audit.log" ]; then
  touch new/agent/agent_audit.log
  echo "Created empty agent_audit.log file for new agent"
fi

# Ensure data directory exists for the new agent
mkdir -p new/agent/src/data

# Ensure policies.json exists for the new agent
if [ ! -f "new/agent/src/data/policies.json" ]; then
  cat > new/agent/src/data/policies.json << 'EOF'
[
  {
    "id": "policy-1",
    "name": "High Value Order",
    "description": "Orders with total value exceeding $1000 require human approval",
    "target": "orderTotal",
    "operator": ">",
    "value": 1000,
    "enabled": true,
    "createdAt": "2025-04-05T00:00:00.000Z"
  },
  {
    "id": "policy-2",
    "name": "Bulk Order",
    "description": "Orders with quantity exceeding 10 units require human approval",
    "target": "orderQuantity",
    "operator": ">",
    "value": 10,
    "enabled": true,
    "createdAt": "2025-04-05T00:00:00.000Z"
  },
  {
    "id": "policy-3",
    "name": "Restricted SKU",
    "description": "Orders for product PROD3 require human approval",
    "target": "productSku",
    "operator": "=",
    "value": "PROD3",
    "enabled": false,
    "createdAt": "2025-04-05T00:00:00.000Z"
  },
  {
    "id": "policy-4",
    "name": "Low Balance Protection",
    "description": "Orders that would reduce wallet balance below $100 require human approval",
    "target": "walletBalance",
    "operator": "<",
    "value": 100,
    "enabled": true,
    "createdAt": "2025-04-05T00:00:00.000Z"
  }
]
EOF
  echo "Created default policies.json file for new agent"
fi

echo "All required files are ready"
