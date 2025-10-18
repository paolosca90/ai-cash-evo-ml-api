-- ML Production Tables
-- Tables for ML model training data, samples, and metrics

-- 1. ML Training Samples Table
-- Stores trading samples for continuous learning
CREATE TABLE IF NOT EXISTS ml_training_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  features JSONB NOT NULL, -- 50-dimensional feature vector
  action INTEGER NOT NULL CHECK (action IN (0, 1, 2)), -- 0=BUY, 1=SELL, 2=HOLD
  reward FLOAT NOT NULL,
  pnl FLOAT, -- Actual P&L from trade
  next_features JSONB, -- Features at t+1
  done BOOLEAN DEFAULT false, -- Episode terminated
  log_probability FLOAT, -- log π(a|s)
  value_estimate FLOAT, -- V(s)
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ml_training_samples_symbol ON ml_training_samples(symbol);
CREATE INDEX IF NOT EXISTS idx_ml_training_samples_timestamp ON ml_training_samples(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ml_training_samples_user_id ON ml_training_samples(user_id);

-- 2. ML Training Metrics Table
-- Stores training session metrics
CREATE TABLE IF NOT EXISTS ml_training_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version TEXT NOT NULL,
  epoch INTEGER NOT NULL,
  policy_loss FLOAT,
  value_loss FLOAT,
  entropy_loss FLOAT,
  total_loss FLOAT,
  avg_reward FLOAT,
  avg_advantage FLOAT,
  clip_fraction FLOAT,
  samples_count INTEGER,
  training_duration_ms INTEGER,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_training_metrics_model_version ON ml_training_metrics(model_version);
CREATE INDEX IF NOT EXISTS idx_ml_training_metrics_timestamp ON ml_training_metrics(timestamp DESC);

-- 3. ML Model Versions Table
-- Tracks model versions and performance
CREATE TABLE IF NOT EXISTS ml_model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL UNIQUE,
  model_type TEXT NOT NULL, -- 'ppo', 'cppo', etc.
  config JSONB NOT NULL, -- Model hyperparameters
  performance_metrics JSONB, -- { avg_reward, sharpe_ratio, win_rate, ... }
  is_active BOOLEAN DEFAULT false,
  is_production BOOLEAN DEFAULT false,
  trained_on_samples INTEGER,
  training_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_model_versions_version ON ml_model_versions(version);
CREATE INDEX IF NOT EXISTS idx_ml_model_versions_is_active ON ml_model_versions(is_active);

-- 4. Market Data Cache Table
-- Caches market data for feature engineering
CREATE TABLE IF NOT EXISTS market_data_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  price FLOAT NOT NULL,
  open FLOAT,
  high FLOAT,
  low FLOAT,
  close FLOAT,
  volume FLOAT,
  rsi FLOAT,
  macd FLOAT,
  macd_signal FLOAT,
  macd_histogram FLOAT,
  atr FLOAT,
  sma_9 FLOAT,
  sma_20 FLOAT,
  sma_50 FLOAT,
  ema_9 FLOAT,
  ema_20 FLOAT,
  avg_volume FLOAT,
  stoch_k FLOAT,
  stoch_d FLOAT,
  sentiment FLOAT,
  news_impact FLOAT,
  social_sentiment FLOAT,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_market_data_cache_symbol ON market_data_cache(symbol);
CREATE INDEX IF NOT EXISTS idx_market_data_cache_timestamp ON market_data_cache(timestamp DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_market_data_cache_symbol_timestamp ON market_data_cache(symbol, timestamp);

-- 5. ML Predictions Log Table
-- Logs all ML predictions for analysis
CREATE TABLE IF NOT EXISTS ml_predictions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  predicted_action TEXT NOT NULL CHECK (predicted_action IN ('BUY', 'SELL', 'HOLD')),
  confidence FLOAT NOT NULL,
  epistemic_uncertainty FLOAT,
  aleatoric_uncertainty FLOAT,
  total_uncertainty FLOAT,
  constraints JSONB, -- Array of constraint violations
  features JSONB, -- Feature vector used
  entry_price FLOAT,
  stop_loss FLOAT,
  take_profit FLOAT,
  model_version TEXT,
  processing_time_ms INTEGER,
  was_executed BOOLEAN DEFAULT false,
  actual_result FLOAT, -- Actual P&L if executed
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_predictions_log_symbol ON ml_predictions_log(symbol);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_log_timestamp ON ml_predictions_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_log_user_id ON ml_predictions_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_predictions_log_was_executed ON ml_predictions_log(was_executed);

-- 6. ML Performance Analytics View
-- Aggregates ML performance metrics
CREATE OR REPLACE VIEW ml_performance_analytics AS
SELECT
  symbol,
  COUNT(*) as total_predictions,
  COUNT(*) FILTER (WHERE was_executed) as executed_count,
  AVG(confidence) as avg_confidence,
  AVG(total_uncertainty) as avg_uncertainty,
  AVG(actual_result) FILTER (WHERE actual_result IS NOT NULL) as avg_pnl,
  COUNT(*) FILTER (WHERE actual_result > 0) as winning_trades,
  COUNT(*) FILTER (WHERE actual_result < 0) as losing_trades,
  COUNT(*) FILTER (WHERE actual_result > 0)::FLOAT / NULLIF(COUNT(*) FILTER (WHERE actual_result IS NOT NULL), 0) as win_rate,
  STDDEV(actual_result) FILTER (WHERE actual_result IS NOT NULL) as pnl_std,
  AVG(processing_time_ms) as avg_processing_time_ms,
  DATE_TRUNC('day', timestamp) as date
FROM ml_predictions_log
WHERE was_executed = true
GROUP BY symbol, DATE_TRUNC('day', timestamp)
ORDER BY date DESC;

-- 7. Enable Row Level Security
ALTER TABLE ml_training_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_training_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_data_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_predictions_log ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies

-- ml_training_samples: Users can only access their own samples
CREATE POLICY "Users can insert their own training samples"
  ON ml_training_samples FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own training samples"
  ON ml_training_samples FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- ml_training_metrics: Authenticated users can view
CREATE POLICY "Authenticated users can view training metrics"
  ON ml_training_metrics FOR SELECT
  TO authenticated
  USING (true);

-- ml_model_versions: Authenticated users can view
CREATE POLICY "Authenticated users can view model versions"
  ON ml_model_versions FOR SELECT
  TO authenticated
  USING (true);

-- market_data_cache: Authenticated users can read
CREATE POLICY "Authenticated users can read market data cache"
  ON market_data_cache FOR SELECT
  TO authenticated
  USING (true);

-- Service role can insert/update market data
CREATE POLICY "Service role can manage market data cache"
  ON market_data_cache FOR ALL
  TO service_role
  USING (true);

-- ml_predictions_log: Users can access their own predictions
CREATE POLICY "Users can insert their own predictions"
  ON ml_predictions_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own predictions"
  ON ml_predictions_log FOR SELECT
  USING (auth.uid() = user_id);

-- 9. Functions

-- Function to get latest model version
CREATE OR REPLACE FUNCTION get_latest_model_version(model_type_param TEXT)
RETURNS TEXT AS $$
  SELECT version
  FROM ml_model_versions
  WHERE model_type = model_type_param
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Function to calculate Sharpe ratio from samples
CREATE OR REPLACE FUNCTION calculate_sharpe_ratio(samples_limit INTEGER DEFAULT 1000)
RETURNS FLOAT AS $$
DECLARE
  avg_return FLOAT;
  std_return FLOAT;
  sharpe FLOAT;
BEGIN
  SELECT AVG(reward), STDDEV(reward)
  INTO avg_return, std_return
  FROM (
    SELECT reward
    FROM ml_training_samples
    ORDER BY timestamp DESC
    LIMIT samples_limit
  ) recent_samples;

  IF std_return IS NULL OR std_return = 0 THEN
    RETURN 0;
  END IF;

  sharpe := avg_return / std_return;
  RETURN sharpe;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get model performance stats
CREATE OR REPLACE FUNCTION get_model_performance_stats(version_param TEXT)
RETURNS TABLE (
  total_samples INTEGER,
  avg_reward FLOAT,
  win_rate FLOAT,
  sharpe_ratio FLOAT,
  max_drawdown FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_samples,
    AVG(reward) as avg_reward,
    COUNT(*) FILTER (WHERE reward > 0)::FLOAT / NULLIF(COUNT(*), 0) as win_rate,
    CASE
      WHEN STDDEV(reward) > 0 THEN AVG(reward) / STDDEV(reward)
      ELSE 0
    END as sharpe_ratio,
    MIN(
      SUM(reward) OVER (ORDER BY timestamp ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
    ) as max_drawdown
  FROM ml_training_samples
  WHERE timestamp >= (
    SELECT training_completed_at
    FROM ml_model_versions
    WHERE version = version_param
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_latest_model_version TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_sharpe_ratio TO authenticated;
GRANT EXECUTE ON FUNCTION get_model_performance_stats TO authenticated;

-- Comments
COMMENT ON TABLE ml_training_samples IS 'Stores trading samples for continuous ML model training';
COMMENT ON TABLE ml_training_metrics IS 'Tracks training session metrics (loss, reward, etc.)';
COMMENT ON TABLE ml_model_versions IS 'Manages ML model versions and their configurations';
COMMENT ON TABLE market_data_cache IS 'Caches market data for feature engineering';
COMMENT ON TABLE ml_predictions_log IS 'Logs all ML predictions for analysis and backtesting';
COMMENT ON VIEW ml_performance_analytics IS 'Aggregated ML performance metrics per symbol per day';
