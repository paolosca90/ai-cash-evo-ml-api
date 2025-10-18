-- MT5 EA Invocation & Callback System - Database Schema
-- Complete schema for MT5 integration with AI trading system

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- MT5 Accounts table
CREATE TABLE IF NOT EXISTS mt5_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_number VARCHAR(20) NOT NULL UNIQUE,
  account_name VARCHAR(100),
  server_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  ea_version VARCHAR(20),
  broker_name VARCHAR(100),
  leverage INTEGER DEFAULT 100,
  balance DECIMAL(15, 2) DEFAULT 0,
  equity DECIMAL(15, 2) DEFAULT 0,
  margin DECIMAL(15, 2) DEFAULT 0,
  free_margin DECIMAL(15, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  trade_allowed BOOLEAN DEFAULT true,
  expert_allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MT5 Connections table
CREATE TABLE IF NOT EXISTS mt5_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES mt5_accounts(id) ON DELETE CASCADE,
  protocol VARCHAR(10) NOT NULL CHECK (protocol IN ('HTTP', 'WebSocket')),
  endpoint_url TEXT NOT NULL,
  api_key TEXT,
  is_connected BOOLEAN DEFAULT false,
  last_ping TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  timeout_ms INTEGER DEFAULT 30000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trade Signals table
CREATE TABLE IF NOT EXISTS trade_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  action VARCHAR(10) NOT NULL CHECK (action IN ('BUY', 'SELL')),
  lot_size DECIMAL(10, 2) NOT NULL CHECK (lot_size > 0),
  stop_loss DECIMAL(15, 5),
  take_profit DECIMAL(15, 5),
  confidence DECIMAL(5, 2) CHECK (confidence >= 0 AND confidence <= 100),
  strategy VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'executing', 'completed', 'failed')),
  executed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trade Log table
CREATE TABLE IF NOT EXISTS trade_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_id UUID REFERENCES trade_signals(id) ON DELETE SET NULL,
  command_id VARCHAR(100) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  action VARCHAR(10) NOT NULL,
  lot_size DECIMAL(10, 2) NOT NULL,
  confidence DECIMAL(5, 2),
  strategy VARCHAR(100),
  success BOOLEAN NOT NULL,
  execution_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MT5 Positions table
CREATE TABLE IF NOT EXISTS mt5_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES mt5_accounts(id) ON DELETE CASCADE,
  position_ticket BIGINT NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('BUY', 'SELL')),
  volume DECIMAL(10, 2) NOT NULL CHECK (volume > 0),
  open_price DECIMAL(15, 5) NOT NULL,
  current_price DECIMAL(15, 5),
  stop_loss DECIMAL(15, 5),
  take_profit DECIMAL(15, 5),
  unrealized_pnl DECIMAL(15, 2) DEFAULT 0,
  realized_pnl DECIMAL(15, 2) DEFAULT 0,
  commission DECIMAL(15, 2) DEFAULT 0,
  swap DECIMAL(15, 2) DEFAULT 0,
  open_time TIMESTAMP WITH TIME ZONE NOT NULL,
  last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  magic_number INTEGER DEFAULT 888777,
  comment TEXT,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(account_id, position_ticket)
);

-- MT5 Orders table
CREATE TABLE IF NOT EXISTS mt5_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES mt5_accounts(id) ON DELETE CASCADE,
  order_ticket BIGINT NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('BUY_STOP', 'SELL_STOP', 'BUY_LIMIT', 'SELL_LIMIT')),
  volume DECIMAL(10, 2) NOT NULL CHECK (volume > 0),
  order_price DECIMAL(15, 5) NOT NULL,
  stop_loss DECIMAL(15, 5),
  take_profit DECIMAL(15, 5),
  state VARCHAR(20) NOT NULL CHECK (state IN ('PLACED', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED', 'EXPIRED')),
  filled_volume DECIMAL(10, 2) DEFAULT 0,
  remaining_volume DECIMAL(10, 2),
  placement_time TIMESTAMP WITH TIME ZONE NOT NULL,
  last_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expiration_time TIMESTAMP WITH TIME ZONE,
  magic_number INTEGER DEFAULT 888777,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(account_id, order_ticket)
);

-- User Statistics table
CREATE TABLE IF NOT EXISTS user_statistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  win_rate DECIMAL(5, 2) DEFAULT 0,
  total_profit DECIMAL(15, 2) DEFAULT 0,
  total_loss DECIMAL(15, 2) DEFAULT 0,
  net_profit DECIMAL(15, 2) DEFAULT 0,
  average_win DECIMAL(15, 2) DEFAULT 0,
  average_loss DECIMAL(15, 2) DEFAULT 0,
  profit_factor DECIMAL(10, 2) DEFAULT 0,
  max_drawdown DECIMAL(15, 2) DEFAULT 0,
  current_drawdown DECIMAL(15, 2) DEFAULT 0,
  sharpe_ratio DECIMAL(10, 2),
  sortino_ratio DECIMAL(10, 2),
  calmar_ratio DECIMAL(10, 2),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Health table
CREATE TABLE IF NOT EXISTS system_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  components JSONB DEFAULT '{}',
  issues TEXT[] DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Batch Log table
CREATE TABLE IF NOT EXISTS batch_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_count INTEGER NOT NULL,
  successful_commands INTEGER NOT NULL,
  failed_commands INTEGER NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  overall_success BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Risk Management Settings table
CREATE TABLE IF NOT EXISTS risk_management_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  max_risk_per_trade DECIMAL(5, 2) DEFAULT 2.0,
  max_daily_risk DECIMAL(5, 2) DEFAULT 10.0,
  max_concurrent_trades INTEGER DEFAULT 10,
  max_positions_per_symbol INTEGER DEFAULT 3,
  max_lot_size DECIMAL(10, 2) DEFAULT 10.0,
  min_lot_size DECIMAL(10, 2) DEFAULT 0.01,
  lot_step DECIMAL(10, 2) DEFAULT 0.01,
  risk_multiplier DECIMAL(5, 2) DEFAULT 1.0,
  use_dynamic_risk BOOLEAN DEFAULT true,
  stop_loss_pips INTEGER DEFAULT 50,
  take_profit_pips INTEGER DEFAULT 100,
  volatility_threshold DECIMAL(10, 3) DEFAULT 0.02,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error Log table
CREATE TABLE IF NOT EXISTS error_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  error_code INTEGER NOT NULL,
  error_message TEXT NOT NULL,
  error_severity VARCHAR(10) NOT NULL CHECK (error_severity IN ('info', 'warning', 'error', 'critical')),
  error_context TEXT,
  is_retryable BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_name VARCHAR(50) NOT NULL,
  metric_value DECIMAL(15, 2) NOT NULL,
  metric_unit VARCHAR(20),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market Data table
CREATE TABLE IF NOT EXISTS market_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol VARCHAR(20) NOT NULL,
  bid DECIMAL(15, 5) NOT NULL,
  ask DECIMAL(15, 5) NOT NULL,
  spread DECIMAL(10, 2) NOT NULL,
  volume BIGINT,
  high_24h DECIMAL(15, 5),
  low_24h DECIMAL(15, 5),
  change_24h DECIMAL(10, 2),
  change_percent_24h DECIMAL(10, 2),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API Keys table for external integrations
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key_name VARCHAR(100) NOT NULL,
  api_key_hash TEXT NOT NULL,
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_used TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook Configurations table
CREATE TABLE IF NOT EXISTS webhook_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  webhook_secret TEXT,
  events TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trading Sessions table
CREATE TABLE IF NOT EXISTS trading_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_name VARCHAR(100) NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT true,
  days_of_week INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- Monday=1, Sunday=7
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE mt5_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt5_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt5_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mt5_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_management_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user data isolation

-- MT5 Accounts policies
CREATE POLICY "Users can view their own MT5 accounts" ON mt5_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own MT5 accounts" ON mt5_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own MT5 accounts" ON mt5_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own MT5 accounts" ON mt5_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Trade Signals policies
CREATE POLICY "Users can view their own trade signals" ON trade_signals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trade signals" ON trade_signals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trade signals" ON trade_signals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trade signals" ON trade_signals
  FOR DELETE USING (auth.uid() = user_id);

-- Trade Log policies
CREATE POLICY "Users can view their own trade log" ON trade_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trade log" ON trade_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Statistics policies
CREATE POLICY "Users can view their own statistics" ON user_statistics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own statistics" ON user_statistics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own statistics" ON user_statistics
  FOR UPDATE USING (auth.uid() = user_id);

-- Risk Management Settings policies
CREATE POLICY "Users can view their own risk settings" ON risk_management_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own risk settings" ON risk_management_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own risk settings" ON risk_management_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Error Log policies
CREATE POLICY "Users can view their own error log" ON error_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own error log" ON error_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Performance Metrics policies
CREATE POLICY "Users can view their own performance metrics" ON performance_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own performance metrics" ON performance_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- API Keys policies
CREATE POLICY "Users can view their own API keys" ON api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys" ON api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" ON api_keys
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" ON api_keys
  FOR DELETE USING (auth.uid() = user_id);

-- Webhook Configurations policies
CREATE POLICY "Users can view their own webhook configurations" ON webhook_configurations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own webhook configurations" ON webhook_configurations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhook configurations" ON webhook_configurations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhook configurations" ON webhook_configurations
  FOR DELETE USING (auth.uid() = user_id);

-- Trading Sessions policies
CREATE POLICY "Users can view their own trading sessions" ON trading_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trading sessions" ON trading_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trading sessions" ON trading_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trading sessions" ON trading_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance optimization

-- MT5 Accounts indexes
CREATE INDEX IF NOT EXISTS idx_mt5_accounts_user_id ON mt5_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_mt5_accounts_account_number ON mt5_accounts(account_number);
CREATE INDEX IF NOT EXISTS idx_mt5_accounts_is_active ON mt5_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_mt5_accounts_created_at ON mt5_accounts(created_at);

-- Trade Signals indexes
CREATE INDEX IF NOT EXISTS idx_trade_signals_user_id ON trade_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_signals_symbol ON trade_signals(symbol);
CREATE INDEX IF NOT EXISTS idx_trade_signals_action ON trade_signals(action);
CREATE INDEX IF NOT EXISTS idx_trade_signals_status ON trade_signals(status);
CREATE INDEX IF NOT EXISTS idx_trade_signals_created_at ON trade_signals(created_at);
CREATE INDEX IF NOT EXISTS idx_trade_signals_confidence ON trade_signals(confidence);

-- Trade Log indexes
CREATE INDEX IF NOT EXISTS idx_trade_log_user_id ON trade_log(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_log_symbol ON trade_log(symbol);
CREATE INDEX IF NOT EXISTS idx_trade_log_success ON trade_log(success);
CREATE INDEX IF NOT EXISTS idx_trade_log_created_at ON trade_log(created_at);

-- MT5 Positions indexes
CREATE INDEX IF NOT EXISTS idx_mt5_positions_account_id ON mt5_positions(account_id);
CREATE INDEX IF NOT EXISTS idx_mt5_positions_symbol ON mt5_positions(symbol);
CREATE INDEX IF NOT EXISTS idx_mt5_positions_type ON mt5_positions(type);
CREATE INDEX IF NOT EXISTS idx_mt5_positions_is_open ON mt5_positions(closed_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_mt5_positions_created_at ON mt5_positions(created_at);

-- MT5 Orders indexes
CREATE INDEX IF NOT EXISTS idx_mt5_orders_account_id ON mt5_orders(account_id);
CREATE INDEX IF NOT EXISTS idx_mt5_orders_symbol ON mt5_orders(symbol);
CREATE INDEX IF NOT EXISTS idx_mt5_orders_type ON mt5_orders(type);
CREATE INDEX IF NOT EXISTS idx_mt5_orders_state ON mt5_orders(state);
CREATE INDEX IF NOT EXISTS idx_mt5_orders_created_at ON mt5_orders(created_at);

-- User Statistics indexes
CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id ON user_statistics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_statistics_updated_at ON user_statistics(updated_at);

-- Error Log indexes
CREATE INDEX IF NOT EXISTS idx_error_log_user_id ON error_log(user_id);
CREATE INDEX IF NOT EXISTS idx_error_log_error_code ON error_log(error_code);
CREATE INDEX IF NOT EXISTS idx_error_log_error_severity ON error_log(error_severity);
CREATE INDEX IF NOT EXISTS idx_error_log_created_at ON error_log(created_at);

-- Performance Metrics indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_metric_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);

-- Market Data indexes
CREATE INDEX IF NOT EXISTS idx_market_data_symbol ON market_data(symbol);
CREATE INDEX IF NOT EXISTS idx_market_data_timestamp ON market_data(timestamp);

-- System Health indexes
CREATE INDEX IF NOT EXISTS idx_system_health_timestamp ON system_health(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON system_health(status);

-- Batch Log indexes
CREATE INDEX IF NOT EXISTS idx_batch_log_user_id ON batch_log(user_id);
CREATE INDEX IF NOT EXISTS idx_batch_log_created_at ON batch_log(created_at);

-- Risk Management Settings indexes
CREATE INDEX IF NOT EXISTS idx_risk_management_settings_user_id ON risk_management_settings(user_id);

-- API Keys indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- Webhook Configurations indexes
CREATE INDEX IF NOT EXISTS idx_webhook_configurations_user_id ON webhook_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_configurations_is_active ON webhook_configurations(is_active);

-- Trading Sessions indexes
CREATE INDEX IF NOT EXISTS idx_trading_sessions_user_id ON trading_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_sessions_is_active ON trading_sessions(is_active);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_mt5_accounts_updated_at BEFORE UPDATE ON mt5_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mt5_connections_updated_at BEFORE UPDATE ON mt5_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trade_signals_updated_at BEFORE UPDATE ON trade_signals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mt5_positions_updated_at BEFORE UPDATE ON mt5_positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mt5_orders_updated_at BEFORE UPDATE ON mt5_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_statistics_updated_at BEFORE UPDATE ON user_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_management_settings_updated_at BEFORE UPDATE ON risk_management_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webhook_configurations_updated_at BEFORE UPDATE ON webhook_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_sessions_updated_at BEFORE UPDATE ON trading_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update position last_update timestamp
CREATE OR REPLACE FUNCTION update_position_last_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_update = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mt5_positions_last_update BEFORE UPDATE ON mt5_positions
    FOR EACH ROW EXECUTE FUNCTION update_position_last_update();

-- Create function to update order last_update timestamp
CREATE OR REPLACE FUNCTION update_order_last_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_update = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mt5_orders_last_update BEFORE UPDATE ON mt5_orders
    FOR EACH ROW EXECUTE FUNCTION update_order_last_update();

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create default risk management settings for new users
CREATE OR REPLACE FUNCTION create_default_risk_management()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO risk_management_settings (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_default_risk_management_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_risk_management();

-- Create default user statistics for new users
CREATE OR REPLACE FUNCTION create_default_user_statistics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_statistics (user_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_default_user_statistics_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_default_user_statistics();

-- Add comments for documentation
COMMENT ON TABLE mt5_accounts IS 'MT5 trading accounts linked to users';
COMMENT ON TABLE mt5_connections IS 'Connection configurations for MT5 Expert Advisors';
COMMENT ON TABLE trade_signals IS 'AI-generated trading signals for execution';
COMMENT ON TABLE trade_log IS 'Comprehensive log of all trade executions';
COMMENT ON TABLE mt5_positions IS 'Current and historical trading positions';
COMMENT ON TABLE mt5_orders IS 'Pending and executed order information';
COMMENT ON TABLE user_statistics IS 'User-specific trading statistics and performance metrics';
COMMENT ON TABLE system_health IS 'System health monitoring and status information';
COMMENT ON TABLE batch_log IS 'Batch execution logs for grouped trade signals';
COMMENT ON TABLE risk_management_settings IS 'User-configurable risk management parameters';
COMMENT ON TABLE error_log IS 'Comprehensive error logging and tracking';
COMMENT ON TABLE performance_metrics IS 'System and user performance metrics';
COMMENT ON TABLE market_data IS 'Real-time and historical market data';
COMMENT ON TABLE api_keys IS 'API key management for external integrations';
COMMENT ON TABLE webhook_configurations IS 'Webhook endpoint configurations for callbacks';
COMMENT ON TABLE trading_sessions IS 'User-defined trading session configurations';