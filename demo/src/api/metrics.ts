// src/api/metrics.ts
import { Registry, Counter, Gauge, Histogram } from 'prom-client';

// Create a Registry to register the metrics
const register = new Registry();

// Define metrics
export const metrics = {
  // Agent wallet metrics
  wallet_balance: new Gauge({
    name: 'ueta_agent_wallet_balance',
    help: 'Current agent wallet balance',
    registers: [register],
  }),

  // Agent order metrics
  orders_placed_total: new Counter({
    name: 'ueta_agent_orders_placed_total',
    help: 'Total number of orders placed by the agent',
    registers: [register],
  }),

  order_errors_total: new Counter({
    name: 'ueta_agent_order_errors_total',
    help: 'Total number of order errors',
    registers: [register],
  }),

  order_attempts_total: new Counter({
    name: 'ueta_agent_order_attempts_total',
    help: 'Total number of order attempts',
    registers: [register],
  }),

  pending_approvals: new Gauge({
    name: 'ueta_agent_pending_approvals',
    help: 'Current number of orders waiting for approval',
    registers: [register],
  }),

  pending_approval_value: new Gauge({
    name: 'ueta_agent_pending_approval_value',
    help: 'Total value of orders waiting for approval',
    registers: [register],
  }),

  // Approval metrics
  approvals_total: new Counter({
    name: 'ueta_agent_approvals_total',
    help: 'Total number of approved orders',
    registers: [register],
  }),

  rejections_total: new Counter({
    name: 'ueta_agent_rejections_total',
    help: 'Total number of rejected orders',
    registers: [register],
  }),

  // Human intervention metrics
  human_pending_review: new Gauge({
    name: 'ueta_human_pending_review',
    help: 'Number of orders pending human review',
    registers: [register],
  }),

  human_approvals_total: new Counter({
    name: 'ueta_human_approvals_total',
    help: 'Total number of human approvals',
    registers: [register],
  }),

  human_reverts_total: new Counter({
    name: 'ueta_human_reverts_total',
    help: 'Total number of human reverts',
    registers: [register],
  }),

  human_approval_duration: new Histogram({
    name: 'ueta_human_approval_duration_seconds',
    help: 'Time taken for human approval',
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
    registers: [register],
  }),

  // API performance metrics
  order_response_time: new Histogram({
    name: 'ueta_agent_order_response_time_seconds',
    help: 'Time taken to respond to an order request',
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    registers: [register],
  }),
};

// Export the registry
export default register;
