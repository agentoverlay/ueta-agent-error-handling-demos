import * as prometheus from 'prom-client';

// Create a Registry to register the metrics
export const register = new prometheus.Registry();

// Add default metrics (CPU, memory, etc.)
prometheus.collectDefaultMetrics({ register });

// Create custom metrics
export const orderCounter = new prometheus.Counter({
  name: 'ueta_seller_orders_total',
  help: 'Total number of orders received',
  labelNames: ['status'] as const,
});

export const orderDurationHistogram = new prometheus.Histogram({
  name: 'ueta_seller_order_processing_duration_seconds',
  help: 'Duration of order processing in seconds',
  buckets: [0.1, 0.5, 1, 2, 5],
});

export const pendingOrdersGauge = new prometheus.Gauge({
  name: 'ueta_seller_pending_orders',
  help: 'Number of orders pending confirmation',
});

export const errorOrdersGauge = new prometheus.Gauge({
  name: 'ueta_seller_error_orders',
  help: 'Number of orders in error state',
});

export const orderValueSummary = new prometheus.Summary({
  name: 'ueta_seller_order_value',
  help: 'Summary of order values',
  percentiles: [0.5, 0.9, 0.95, 0.99],
});

// Register all metrics
register.registerMetric(orderCounter);
register.registerMetric(orderDurationHistogram);
register.registerMetric(pendingOrdersGauge);
register.registerMetric(errorOrdersGauge);
register.registerMetric(orderValueSummary);
