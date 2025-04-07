#!/bin/sh
# ensure-files.sh
# Ensure required files and directories exist

# Create necessary directories
mkdir -p src/data
mkdir -p data/seller

# Create empty files with default content if they don't exist
[ -f src/account.json ] || echo '{"id":"default","wallet":1000}' > src/account.json
[ -f src/agent_audit.log ] || touch src/agent_audit.log
[ -f src/data/policies.json ] || echo '[]' > src/data/policies.json
[ -f src/data/order_meta.json ] || echo '{}' > src/data/order_meta.json

# Ensure data/seller directory has required files
[ -f data/seller/products.json ] || echo '[]' > data/seller/products.json
[ -f data/seller/orders.json ] || echo '[]' > data/seller/orders.json
[ -f data/seller/seller_policies.json ] || echo '[]' > data/seller/seller_policies.json
[ -f data/seller/seller_audit.log ] || touch data/seller/seller_audit.log

echo "All required files and directories have been created."
