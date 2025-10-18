-- ML Historical Data Storage
-- Stores historical candle data with ML labels for training

CREATE TABLE IF NOT EXISTS ml_historical_candles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol VARCHAR(20) NOT NULL,
  granularity VARCHAR(5) NOT NULL, -- M1, M5, M15, H1, H4, D1
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- OHLCV data
  open DECIMAL(15,5) NOT NULL,
  high DECIMAL(15,5) NOT NULL,
  low DECIMAL(15,5) NOT NULL,
  close DECIMAL(15,5) NOT NULL,
  volume BIGINT NOT NULL,
  
  -- Technical indicators (computed at insert time)
  ema12 DECIMAL(15,5),
  ema21 DECIMAL(15,5),
  ema50 DECIMAL(15,5),
  rsi DECIMAL(5,2),
  atr DECIMAL(15,5),
  adx DECIMAL(5,2),
  
  -- Labels for ML training
  future_return_5m DECIMAL(10,5),   -- % return after 5 min
  future_return_15m DECIMAL(10,5),  -- % return after 15 min
  future_return_1h DECIMAL(10,5),   -- % return after 1 hour
  future_return_4h DECIMAL(10,5),   -- % return after 4 hours
  
  -- Backtest label (BUY/SELL/HOLD)
  label VARCHAR(10),
  label_confidence DECIMAL(5,2),
  
  -- Trade outcome if signal was generated here
  trade_outcome VARCHAR(10), -- WIN, LOSS, BREAKEVEN
  win_pips DECIMAL(10,2),
  loss_pips DECIMAL(10,2),
  trade_duration_minutes INT,
  
  -- Quality flags
  is_labeled BOOLEAN DEFAULT false,
  label_quality DECIMAL(5,2), -- 0-100 score
  
  -- Dataset split
  dataset_type VARCHAR(20) DEFAULT 'training', -- 'training' or 'testing'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(symbol, granularity, timestamp)
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_ml_candles_symbol_time 
ON ml_historical_candles(symbol, granularity, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_ml_candles_labeled 
ON ml_historical_candles(is_labeled) 
WHERE is_labeled = true;

CREATE INDEX IF NOT EXISTS idx_ml_candles_label 
ON ml_historical_candles(label) 
WHERE label IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ml_candles_symbol_gran 
ON ml_historical_candles(symbol, granularity);

-- Training batches tracking
CREATE TABLE IF NOT EXISTS ml_training_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_name VARCHAR(100) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  granularity VARCHAR(5) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  total_candles INT NOT NULL,
  labeled_candles INT NOT NULL,
  buy_signals INT DEFAULT 0,
  sell_signals INT DEFAULT 0,
  hold_signals INT DEFAULT 0,
  avg_label_quality DECIMAL(5,2),
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_training_batches_status 
ON ml_training_batches(status);

-- Model training runs
CREATE TABLE IF NOT EXISTS ml_model_training_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_name VARCHAR(100) NOT NULL,
  model_type VARCHAR(20) NOT NULL, -- PPO, CPPO, DQN, etc
  version VARCHAR(20) NOT NULL,
  
  -- Training config
  training_config JSONB NOT NULL,
  
  -- Training data
  training_batch_ids UUID[] NOT NULL,
  total_samples INT NOT NULL,
  train_samples INT NOT NULL,
  validation_samples INT NOT NULL,
  
  -- Training metrics
  final_loss DECIMAL(10,5),
  final_accuracy DECIMAL(5,2),
  best_validation_accuracy DECIMAL(5,2),
  training_epochs INT,
  training_duration_seconds INT,
  
  -- Model storage
  model_path TEXT, -- Path in Supabase Storage
  model_size_bytes BIGINT,
  
  -- Performance metrics
  backtest_win_rate DECIMAL(5,2),
  backtest_profit_factor DECIMAL(10,2),
  backtest_sharpe_ratio DECIMAL(10,2),
  
  status VARCHAR(20) DEFAULT 'started', -- started, training, completed, failed
  error_message TEXT,
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  deployed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_model_runs_status 
ON ml_model_training_runs(status);

CREATE INDEX IF NOT EXISTS idx_model_runs_version 
ON ml_model_training_runs(model_type, version);

-- Data quality checks
CREATE TABLE IF NOT EXISTS ml_data_quality_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID REFERENCES ml_training_batches(id) ON DELETE CASCADE,
  check_type VARCHAR(50) NOT NULL, -- missing_data, outliers, label_consistency, etc
  severity VARCHAR(20) NOT NULL, -- info, warning, error
  message TEXT NOT NULL,
  affected_candles INT DEFAULT 0,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments
COMMENT ON TABLE ml_historical_candles IS 'Historical market data with ML labels for training';
COMMENT ON TABLE ml_training_batches IS 'Tracks batches of labeled data for model training';
COMMENT ON TABLE ml_model_training_runs IS 'Tracks individual model training runs and their metrics';
COMMENT ON TABLE ml_data_quality_checks IS 'Data quality validation results';

-- Grant permissions
ALTER TABLE ml_historical_candles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_training_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_model_training_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_data_quality_checks ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to ml_historical_candles" 
ON ml_historical_candles FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to ml_training_batches" 
ON ml_training_batches FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to ml_model_training_runs" 
ON ml_model_training_runs FOR ALL 
USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to ml_data_quality_checks" 
ON ml_data_quality_checks FOR ALL 
USING (auth.role() = 'service_role');
