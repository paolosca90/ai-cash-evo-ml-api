// MT5 EA Invocation & Callback System Types
// Comprehensive type definitions for MT5 trading integration

export interface MT5Account {
  id: string;
  account_number: string;
  account_name?: string;
  server_name?: string;
  is_active: boolean;
  last_heartbeat: string;
  ea_version?: string;
  broker_name?: string;
  leverage: number;
  balance: number;
  equity: number;
  margin: number;
  free_margin: number;
  currency: string;
  trade_allowed: boolean;
  expert_allowed: boolean;
}

export interface MT5Connection {
  id: string;
  account_id: string;
  protocol: 'HTTP' | 'WebSocket';
  endpoint_url: string;
  api_key?: string;
  is_connected: boolean;
  last_ping: string;
  retry_count: number;
  max_retries: number;
  timeout_ms: number;
}

export interface TradeCommand {
  id: string;
  account_id: string;
  symbol: string;
  action: TradeAction;
  lot_size: number;
  order_type: OrderType;
  price?: number;
  stop_loss?: number;
  take_profit?: number;
  comment?: string;
  magic_number: number;
  deviation?: number;
  expiration?: Date;
  stop_limit?: number;
  request_id?: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export type TradeAction = 'BUY' | 'SELL' | 'BUY_STOP' | 'SELL_STOP' | 'BUY_LIMIT' | 'SELL_LIMIT' | 'CLOSE' | 'MODIFY' | 'CANCEL';
export type OrderType = 'MARKET' | 'PENDING' | 'POSITION';

export interface TradeCallback {
  request_id: string;
  account_id: string;
  success: boolean;
  order_ticket?: number;
  position_ticket?: number;
  execution_price?: number;
  executed_volume?: number;
  execution_time?: Date;
  error_code?: number;
  error_message?: string;
  broker_comment?: string;
  commission?: number;
  swap?: number;
  profit?: number;
  margin_used?: number;
  timestamp: Date;
}

export interface PositionUpdate {
  account_id: string;
  position_ticket: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  open_price: number;
  current_price: number;
  stop_loss?: number;
  take_profit?: number;
  unrealized_pnl: number;
  realized_pnl: number;
  commission: number;
  swap: number;
  open_time: Date;
  last_update: Date;
  magic_number: number;
  comment?: string;
}

export interface OrderUpdate {
  account_id: string;
  order_ticket: number;
  symbol: string;
  type: 'BUY_STOP' | 'SELL_STOP' | 'BUY_LIMIT' | 'SELL_LIMIT';
  volume: number;
  order_price: number;
  stop_loss?: number;
  take_profit?: number;
  state: 'PLACED' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'EXPIRED';
  filled_volume?: number;
  remaining_volume?: number;
  placement_time: Date;
  last_update: Date;
  expiration_time?: Date;
  magic_number: number;
  comment?: string;
}

export interface RiskManagement {
  max_risk_per_trade: number; // percentage
  max_daily_risk: number;
  max_concurrent_trades: number;
  max_positions_per_symbol: number;
  stop_loss_pips?: number;
  take_profit_pips?: number;
  max_lot_size: number;
  min_lot_size: number;
  lot_step: number;
  risk_multiplier: number;
  use_dynamic_risk: boolean;
  volatility_threshold?: number;
}

export interface MarketData {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  timestamp: Date;
  volume: number;
  high_24h: number;
  low_24h: number;
  change_24h: number;
  change_percent_24h: number;
}

export interface MT5Error {
  code: number;
  message: string;
  timestamp: Date;
  context?: string;
  retryable: boolean;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface ConnectionStatus {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
  last_connected?: Date;
  last_disconnected?: Date;
  uptime_ms: number;
  latency_ms: number;
  error_count: number;
  retry_count: number;
  protocol: 'HTTP' | 'WebSocket';
}

export interface TradingStatistics {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_profit: number;
  total_loss: number;
  net_profit: number;
  average_win: number;
  average_loss: number;
  profit_factor: number;
  max_drawdown: number;
  current_drawdown: number;
  sharpe_ratio?: number;
  sortino_ratio?: number;
  calmar_ratio?: number;
}

export interface TradeJournal {
  id: string;
  account_id: string;
  request_id: string;
  signal_id?: string;
  symbol: string;
  action: TradeAction;
  lot_size: number;
  entry_price?: number;
  exit_price?: number;
  stop_loss?: number;
  take_profit?: number;
  profit_loss?: number;
  commission?: number;
  swap?: number;
  duration_ms?: number;
  exit_reason?: string;
  ai_confidence?: number;
  strategy_used?: string;
  risk_level?: number;
  timestamp: Date;
  is_paper_trading: boolean;
}

export interface SystemConfig {
  http_timeout: number;
  ws_timeout: number;
  max_retries: number;
  retry_delay_ms: number;
  heartbeat_interval_ms: number;
  command_queue_size: number;
  callback_queue_size: number;
  enable_logging: boolean;
  log_level: 'debug' | 'info' | 'warn' | 'error';
  enable_metrics: boolean;
  metrics_interval_ms: number;
}

// Payload types for different message types
export interface HeartbeatPayload {
  account_id: string;
  timestamp: Date;
  ea_version?: string;
  account_number: string;
  broker_name?: string;
  server_name?: string;
}

export interface CommandPayload {
  command: TradeCommand;
  account_id: string;
}

export interface CallbackPayload {
  callback: TradeCallback;
  account_id: string;
}

export interface PositionUpdatePayload {
  position: PositionUpdate;
  account_id: string;
}

export interface OrderUpdatePayload {
  order: OrderUpdate;
  account_id: string;
}

export interface ErrorPayload {
  error: MT5Error;
  account_id: string;
}

export interface MarketDataPayload {
  market_data: MarketData;
  account_id: string;
}

export type WebSocketMessagePayload =
  | HeartbeatPayload
  | CommandPayload
  | CallbackPayload
  | PositionUpdatePayload
  | OrderUpdatePayload
  | ErrorPayload
  | MarketDataPayload;

export interface WebSocketMessage {
  type: 'heartbeat' | 'command' | 'callback' | 'position_update' | 'order_update' | 'error' | 'market_data';
  payload: WebSocketMessagePayload;
  timestamp: Date;
  message_id: string;
  account_id?: string;
}

export interface QueuedCommand {
  command: TradeCommand;
  attempt_count: number;
  next_attempt_time: Date;
  priority: number;
  created_at: Date;
  last_attempt?: Date;
}

// Response types for different commands
export interface TradeResponse {
  order_ticket?: number;
  position_ticket?: number;
  execution_price?: number;
  executed_volume?: number;
  execution_time?: Date;
  broker_comment?: string;
  commission?: number;
  swap?: number;
  profit?: number;
  margin_used?: number;
}

export type CommandResponse = TradeResponse | Record<string, unknown>;

export interface CommandResult {
  success: boolean;
  command_id: string;
  execution_time_ms: number;
  response?: CommandResponse;
  error?: MT5Error;
  callback_received: boolean;
}

// Webhook data types
export interface TradeExecutionData {
  order_ticket?: number;
  position_ticket?: number;
  symbol: string;
  action: TradeAction;
  volume: number;
  price?: number;
  execution_price?: number;
  profit_loss?: number;
  status: 'success' | 'failed' | 'pending';
}

export interface PositionUpdateData {
  position_ticket: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  open_price: number;
  current_price: number;
  unrealized_pnl: number;
  status: 'open' | 'closed' | 'modified';
}

export interface OrderUpdateData {
  order_ticket: number;
  symbol: string;
  type: 'BUY_STOP' | 'SELL_STOP' | 'BUY_LIMIT' | 'SELL_LIMIT';
  volume: number;
  order_price: number;
  state: 'PLACED' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'EXPIRED';
}

export interface ErrorData {
  error_code: number;
  error_message: string;
  context?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface HeartbeatData {
  account_number: string;
  ea_version?: string;
  broker_name?: string;
  server_name?: string;
  status: 'online' | 'offline';
}

export type WebhookDataType =
  | TradeExecutionData
  | PositionUpdateData
  | OrderUpdateData
  | ErrorData
  | HeartbeatData;

// Webhook interfaces
export interface WebhookPayload {
  type: 'trade_execution' | 'position_update' | 'order_update' | 'error' | 'heartbeat';
  account_id: string;
  timestamp: Date;
  data: WebhookDataType;
  signature?: string;
  api_key?: string;
}

// Risk assessment interface
export interface RiskAssessment {
  account_risk_level: 'low' | 'medium' | 'high' | 'critical';
  trade_risk_score: number;
  position_size_recommendation: number;
  recommended_stop_loss?: number;
  recommended_take_profit?: number;
  confidence_level: number;
  warnings: string[];
  should_execute: boolean;
}

// Batch processing interfaces
export interface BatchCommand {
  id: string;
  account_id: string;
  commands: TradeCommand[];
  execution_strategy: 'parallel' | 'sequential' | 'conditional';
  timeout_ms: number;
  continue_on_error: boolean;
  timestamp: Date;
}

export interface BatchResult {
  batch_id: string;
  total_commands: number;
  successful_commands: number;
  failed_commands: number;
  execution_time_ms: number;
  results: CommandResult[];
  overall_success: boolean;
}

// Performance metrics
export interface PerformanceMetrics {
  command_latency: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    max: number;
    min: number;
    avg: number;
  };
  callback_latency: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    max: number;
    min: number;
    avg: number;
  };
  success_rate: number;
  error_rate: number;
  commands_per_second: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
  uptime_ms: number;
}

// Health check
export interface HealthStatus {
  overall_status: 'healthy' | 'degraded' | 'unhealthy';
  components: {
    http_connection: boolean;
    websocket_connection: boolean;
    database: boolean;
    authentication: boolean;
    risk_management: boolean;
  };
  last_check: Date;
  issues: string[];
  recommendations: string[];
}