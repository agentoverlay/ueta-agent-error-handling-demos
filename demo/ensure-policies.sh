#!/bin/bash

# Ensure data directory exists
mkdir -p src/data

# Ensure policies.json exists
if [ ! -f "src/data/policies.json" ]; then
  cat > src/data/policies.json << 'EOF'
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
  echo "Created default policies.json file"
fi

echo "Policies file is ready"
