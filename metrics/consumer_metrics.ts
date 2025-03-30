import * as prometheus from 'prom-client';

// Create a Registry to register the metrics
export const register = new prometheus.Registry();

// Add default metrics (CPU, memory, etc.)
prometheus.collectDefaultMetrics({ register });

// Create custom metrics
export const flaggedOrdersCounter = new prometheus.Counter({
  name: 'ueta_consumer_flagged_orders_total',
  help: 'Total number of orders flagged for consumer review',
  labelNames: ['status'] as const,
});

export const approvalCounter = new prometheus.Counter({
  name: 'ueta_consumer_approvals_total',
  help: 'Total number of orders approved by consumer',
});

export const revertCounter = new prometheus.Counter({
  name: 'ueta_consumer_reverts_total',
  help: 'Total number of orders reverted by consumer',
});

export const pendingReviewGauge = new prometheus.Gauge({
  name: 'ueta_consumer_pending_review',
  help: 'Number of orders pending consumer review',
});

export const approvalDurationHistogram = new prometheus.Histogram({
  name: 'ueta_consumer_approval_duration_seconds',
  help: 'Duration between flagging and approval/revert in seconds',
  buckets: [60, 300, 600, 1800, 3600, 7200],
});

// Register all metrics
register.registerMetric(flaggedOrdersCounter);
register.registerMetric(approvalCounter);
register.registerMetric(revertCounter);
register.registerMetric(pendingReviewGauge);
register.registerMetric(approvalDurationHistogram);
