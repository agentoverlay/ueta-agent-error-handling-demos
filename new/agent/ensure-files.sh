#!/bin/bash

# Ensure account.json exists
if [ ! -f "account.json" ]; then
  echo "{}" > account.json
  echo "Created empty account.json file"
fi

# Ensure agent_audit.log exists
if [ ! -f "agent_audit.log" ]; then
  touch agent_audit.log
  echo "Created empty agent_audit.log file"
fi

echo "All required files are ready"
