import * as prometheus from 'prom-client';

// Create a Registry to register the metrics
export const register = new prometheus.Registry();

// Add default metrics (CPU, memory, etc.)
prometheus.collectDefaultMetrics({ register });

// Create custom metrics
export const orderPlacedCounter = new prometheus.Counter({
  name: 'ueta_agent_orders_placed_total',
  help: 'Total number of orders placed by agent',
});

export const orderErrorCounter = new prometheus.Counter({
  name: 'ueta_agent_order_errors_total',
  help: 'Total number of order errors encountered by agent',
});

export const walletBalanceGauge = new prometheus.Gauge({
  name: 'ueta_agent_wallet_balance',
  help: 'Current wallet balance of the agent',
});

export const orderAttemptCounter = new prometheus.Counter({
  name: 'ueta_agent_order_attempts_total',
  help: 'Total number of order attempts by agent (includes failed attempts)',
});

export const orderResponseTimeHistogram = new prometheus.Histogram({
  name: 'ueta_agent_order_response_time_seconds',
  help: 'Response time for agent order requests',
  buckets: [0.05, 0.1, 0.5, 1, 2, 5],
});

// Register all metrics
register.registerMetric(orderPlacedCounter);
register.registerMetric(orderErrorCounter);
register.registerMetric(walletBalanceGauge);
register.registerMetric(orderAttemptCounter);
register.registerMetric(orderResponseTimeHistogram);
