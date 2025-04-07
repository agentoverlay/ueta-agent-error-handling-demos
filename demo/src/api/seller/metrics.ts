// src/api/seller/metrics.ts
import { Registry, Counter, Gauge, Histogram } from 'prom-client';

// Create a Registry to register the metrics
const register = new Registry();

// Define metrics
export const metrics = {
  // Order metrics
  orders_total: new Counter({
    name: 'ueta_seller_orders_total',
    help: 'Total number of orders by status',
    labelNames: ['status'],
    registers: [register],
  }),

  pending_orders: new Gauge({
    name: 'ueta_seller_pending_orders',
    help: 'Current number of pending orders',
    registers: [register],
  }),

  pending_approvals: new Gauge({
    name: 'ueta_seller_pending_approvals',
    help: 'Current number of orders pending approval',
    registers: [register],
  }),

  order_processing_duration: new Histogram({
    name: 'ueta_seller_order_processing_duration_seconds',
    help: 'Time spent processing orders',
    buckets: [0.1, 0.5, 1, 2, 5],
    registers: [register],
  }),

  order_value_total: new Counter({
    name: 'ueta_seller_order_value_total',
    help: 'Total value of all orders',
    registers: [register],
  }),

  order_value_pending: new Gauge({
    name: 'ueta_seller_order_value_pending',
    help: 'Total value of pending orders',
    registers: [register],
  }),

  // Approval metrics
  approvals_total: new Counter({
    name: 'ueta_seller_approvals_total',
    help: 'Total number of approved orders',
    registers: [register],
  }),

  rejections_total: new Counter({
    name: 'ueta_seller_rejections_total',
    help: 'Total number of rejected orders',
    registers: [register],
  }),
};

// Export the registry
export default register;
