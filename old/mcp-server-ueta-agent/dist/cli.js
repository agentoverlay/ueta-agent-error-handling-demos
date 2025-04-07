#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
// Always use in-memory storage
console.error('Starting UETA Agent MCP server in pure in-memory mode...');
console.error('No file system access required.');
console.error('');
console.error('Available tools:');
console.error('- ueta-create-account: Create a new account with initial deposit');
console.error('- ueta-check-balance: Check your current balance and recent transactions');
console.error('- ueta-add-funds: Add funds to your wallet');
console.error('- ueta-withdraw-funds: Withdraw funds from your wallet');
console.error('- ueta-transaction-stats: View transaction statistics');
console.error('- ueta-place-order: Place an order for a product');
console.error('- ueta-get-pending-orders: View your pending orders');
console.error('- ueta-approve-order: Approve a pending order');
console.error('- ueta-start-autonomous-agent: Start automated ordering');
console.error('');
console.error('Resources:');
console.error('- wallet://info: View wallet balance and recent transactions');
console.error('- transactions://history: View complete transaction history');
console.error('- products://list: View available products');
console.error('- pending://orders: View pending orders');
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server_1.server.connect(transport);
}
main().catch(error => {
    console.error('Error starting MCP server:', error);
    process.exit(1);
});
