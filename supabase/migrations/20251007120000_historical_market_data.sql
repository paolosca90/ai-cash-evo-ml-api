-- Historical Market Data for ML Training
-- Stores OANDA historical data for training RL models

-- Table: historical_market_data
-- Stores raw OHLCV data from OANDA
CREATE TABLE IF NOT EXISTS historical_market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Instrument and timeframe
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('M1', 'M5', 'M15', 'H1', 'H4', 'D')),

  -- OHLCV data
  timestamp TIMESTAMPTZ NOT NULL,
  open DECIMAL(20,8) NOT NULL,
  high DECIMAL(20,8) NOT NULL,
  low DECIMAL(20,8) NOT NULL,
  close DECIMAL(20,8) NOT NULL,
  volume BIGINT DEFAULT 0,

  -- Technical Indicators (calculated during import)
  rsi DECIMAL(5,2),
  macd DECIMAL(20,8),
  macd_signal DECIMAL(20,8),
  macd_histogram DECIMAL(20,8),
  atr DECIMAL(20,8),
  adx DECIMAL(5,2),

  -- Moving averages
  sma_9 DECIMAL(20,8),
  sma_20 DECIMAL(20,8),
  sma_50 DECIMAL(20,8),
  ema_9 DECIMAL(20,8),
  ema_20 DECIMAL(20,8),
  ema_50 DECIMAL(20,8),
  ema_200 DECIMAL(20,8),

  -- Bollinger Bands
  bb_upper DECIMAL(20,8),
  bb_middle DECIMAL(20,8),
  bb_lower DECIMAL(20,8),
  bb_width DECIMAL(10,4),

  -- Stochastic
  stoch_k DECIMAL(5,2),
  stoch_d DECIMAL(5,2),

  -- Session info
  session TEXT CHECK (session IN ('ASIAN', 'LONDON', 'NY', 'OVERLAP', 'OFF_HOURS')),
  is_high_volatility BOOLEAN DEFAULT false,

  -- Market regime
  regime TEXT CHECK (regime IN ('UPTREND', 'DOWNTREND', 'RANGING', 'CONSOLIDATION')),

  -- Metadata
  data_quality_score DECIMAL(3,2) DEFAULT 1.0, -- 0.0-1.0
  has_gaps BOOLEAN DEFAULT false,
  is_validated BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Composite unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_historical_unique
ON historical_market_data(symbol, timeframe, timestamp);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_historical_symbol_timeframe
ON historical_market_data(symbol, timeframe);

CREATE INDEX IF NOT EXISTS idx_historical_timestamp
ON historical_market_data(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_historical_session
ON historical_market_data(session);

CREATE INDEX IF NOT EXISTS idx_historical_regime
ON historical_market_data(regime);

CREATE INDEX IF NOT EXISTS idx_historical_validation
ON historical_market_data(is_validated)
WHERE is_validated = true;

-- Composite index for training queries
CREATE INDEX IF NOT EXISTS idx_historical_training
ON historical_market_data(symbol, timeframe, session, regime, timestamp DESC);


-- Table: training_labels
-- Stores backtest results for supervised learning
CREATE TABLE IF NOT EXISTS training_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Reference to historical data point
  candle_id UUID REFERENCES historical_market_data(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,

  -- Entry data
  entry_price DECIMAL(20,8) NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'HOLD')),

  -- Predicted levels (by backtester)
  stop_loss DECIMAL(20,8),
  take_profit DECIMAL(20,8),

  -- Actual outcome
  outcome TEXT NOT NULL CHECK (outcome IN ('TP_HIT', 'SL_HIT', 'TIMEOUT', 'BREAKEVEN')),
  exit_price DECIMAL(20,8),
  exit_timestamp TIMESTAMPTZ,

  -- Performance metrics
  pnl_pips DECIMAL(10,2),
  pnl_percent DECIMAL(10,4),
  duration_minutes INTEGER,
  win BOOLEAN NOT NULL,

  -- Risk metrics
  risk_reward_ratio DECIMAL(5,2),
  max_adverse_excursion DECIMAL(10,4),
  max_favorable_excursion DECIMAL(10,4),

  -- Features snapshot (50-dim vector)
  features JSONB NOT NULL,

  -- Quality control
  is_valid_sample BOOLEAN DEFAULT true,
  exclusion_reason TEXT,

  -- Metadata
  backtest_run_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_labels_candle
ON training_labels(candle_id);

CREATE INDEX IF NOT EXISTS idx_training_labels_symbol
ON training_labels(symbol);

CREATE INDEX IF NOT EXISTS idx_training_labels_outcome
ON training_labels(outcome);

CREATE INDEX IF NOT EXISTS idx_training_labels_win
ON training_labels(win);

CREATE INDEX IF NOT EXISTS idx_training_labels_valid
ON training_labels(is_valid_sample)
WHERE is_valid_sample = true;

-- Composite index for training
CREATE INDEX IF NOT EXISTS idx_training_labels_ml
ON training_labels(symbol, timeframe, win, is_valid_sample);


-- Table: backtest_runs
-- Tracks backtest execution metadata
CREATE TABLE IF NOT EXISTS backtest_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,

  -- Date range
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,

  -- Results
  total_candles INTEGER,
  total_signals INTEGER,
  valid_labels INTEGER,
  invalid_labels INTEGER,

  -- Performance summary
  win_rate DECIMAL(5,2),
  avg_pnl_pips DECIMAL(10,2),
  sharpe_ratio DECIMAL(10,4),
  max_drawdown_pips DECIMAL(10,2),

  -- Execution metadata
  duration_seconds INTEGER,
  strategy_config JSONB,
  status TEXT CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_backtest_runs_symbol
ON backtest_runs(symbol);

CREATE INDEX IF NOT EXISTS idx_backtest_runs_status
ON backtest_runs(status);

CREATE INDEX IF NOT EXISTS idx_backtest_runs_created
ON backtest_runs(created_at DESC);


-- Table: data_import_log
-- Tracks OANDA data import jobs
CREATE TABLE IF NOT EXISTS data_import_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,

  -- Import range
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,

  -- Results
  candles_imported INTEGER DEFAULT 0,
  candles_skipped INTEGER DEFAULT 0,
  candles_with_errors INTEGER DEFAULT 0,

  -- Quality metrics
  avg_data_quality DECIMAL(3,2),
  gaps_detected INTEGER DEFAULT 0,

  -- Status
  status TEXT CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL')) DEFAULT 'RUNNING',
  error_message TEXT,

  -- Metadata
  import_duration_seconds INTEGER,
  oanda_api_calls INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_data_import_symbol
ON data_import_log(symbol);

CREATE INDEX IF NOT EXISTS idx_data_import_status
ON data_import_log(status);

CREATE INDEX IF NOT EXISTS idx_data_import_created
ON data_import_log(created_at DESC);


-- View: training_data_summary
-- Summary statistics for training data
CREATE OR REPLACE VIEW training_data_summary AS
SELECT
  symbol,
  timeframe,
  COUNT(*) as total_candles,
  MIN(timestamp) as earliest_date,
  MAX(timestamp) as latest_date,
  COUNT(DISTINCT DATE_TRUNC('day', timestamp)) as days_of_data,
  COUNT(*) FILTER (WHERE is_validated = true) as validated_candles,
  COUNT(*) FILTER (WHERE has_gaps = true) as candles_with_gaps,
  AVG(data_quality_score) as avg_quality_score,
  COUNT(DISTINCT session) as unique_sessions,
  COUNT(DISTINCT regime) as unique_regimes
FROM historical_market_data
GROUP BY symbol, timeframe
ORDER BY symbol, timeframe;


-- View: training_labels_summary
-- Summary statistics for labeled data
CREATE OR REPLACE VIEW training_labels_summary AS
SELECT
  symbol,
  timeframe,
  COUNT(*) as total_labels,
  COUNT(*) FILTER (WHERE win = true) as wins,
  COUNT(*) FILTER (WHERE win = false) as losses,
  ROUND((COUNT(*) FILTER (WHERE win = true)::FLOAT / NULLIF(COUNT(*), 0) * 100)::NUMERIC, 2) as win_rate_percent,
  COUNT(*) FILTER (WHERE is_valid_sample = true) as valid_samples,
  ROUND(AVG(pnl_pips)::NUMERIC, 2) as avg_pnl_pips,
  ROUND(AVG(duration_minutes)::NUMERIC, 0) as avg_duration_minutes,
  ROUND(AVG(risk_reward_ratio)::NUMERIC, 2) as avg_risk_reward,
  COUNT(*) FILTER (WHERE outcome = 'TP_HIT') as tp_count,
  COUNT(*) FILTER (WHERE outcome = 'SL_HIT') as sl_count,
  COUNT(*) FILTER (WHERE outcome = 'TIMEOUT') as timeout_count
FROM training_labels
GROUP BY symbol, timeframe
ORDER BY symbol, timeframe;


-- Function: calculate_technical_indicators
-- Calculates indicators for a batch of candles
CREATE OR REPLACE FUNCTION calculate_technical_indicators(
  p_symbol TEXT,
  p_timeframe TEXT,
  p_start_timestamp TIMESTAMPTZ,
  p_end_timestamp TIMESTAMPTZ
)
RETURNS INTEGER AS $$
DECLARE
  v_updated_count INTEGER := 0;
BEGIN
  -- This is a placeholder - actual calculation would be done in the Edge Function
  -- Using SQL window functions for simple moving averages

  WITH calculated AS (
    SELECT
      id,
      -- Simple Moving Averages
      AVG(close) OVER (PARTITION BY symbol, timeframe ORDER BY timestamp ROWS BETWEEN 8 PRECEDING AND CURRENT ROW) as sma_9,
      AVG(close) OVER (PARTITION BY symbol, timeframe ORDER BY timestamp ROWS BETWEEN 19 PRECEDING AND CURRENT ROW) as sma_20,
      AVG(close) OVER (PARTITION BY symbol, timeframe ORDER BY timestamp ROWS BETWEEN 49 PRECEDING AND CURRENT ROW) as sma_50
    FROM historical_market_data
    WHERE symbol = p_symbol
      AND timeframe = p_timeframe
      AND timestamp BETWEEN p_start_timestamp AND p_end_timestamp
  )
  UPDATE historical_market_data h
  SET
    sma_9 = calculated.sma_9,
    sma_20 = calculated.sma_20,
    sma_50 = calculated.sma_50
  FROM calculated
  WHERE h.id = calculated.id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql;


-- Function: get_training_batch
-- Gets a batch of training samples for ML
CREATE OR REPLACE FUNCTION get_training_batch(
  p_symbol TEXT,
  p_batch_size INTEGER DEFAULT 1000,
  p_min_win_rate DECIMAL DEFAULT 0.3,
  p_max_win_rate DECIMAL DEFAULT 0.7
)
RETURNS TABLE (
  label_id UUID,
  features JSONB,
  action INTEGER, -- 0=BUY, 1=SELL, 2=HOLD
  reward FLOAT,
  win BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tl.id as label_id,
    tl.features,
    CASE tl.signal_type
      WHEN 'BUY' THEN 0
      WHEN 'SELL' THEN 1
      ELSE 2
    END as action,
    COALESCE(tl.pnl_pips::FLOAT, 0.0) as reward,
    tl.win
  FROM training_labels tl
  WHERE tl.symbol = p_symbol
    AND tl.is_valid_sample = true
  ORDER BY RANDOM()
  LIMIT p_batch_size;
END;
$$ LANGUAGE plpgsql STABLE;


-- RLS Policies
ALTER TABLE historical_market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtest_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_import_log ENABLE ROW LEVEL SECURITY;

-- Public read access for training data
CREATE POLICY "Public read historical data"
  ON historical_market_data FOR SELECT
  USING (true);

CREATE POLICY "Service role full access historical"
  ON historical_market_data FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Public read training labels"
  ON training_labels FOR SELECT
  USING (true);

CREATE POLICY "Service role full access labels"
  ON training_labels FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Public read backtest runs"
  ON backtest_runs FOR SELECT
  USING (true);

CREATE POLICY "Service role full access backtest"
  ON backtest_runs FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Public read import log"
  ON data_import_log FOR SELECT
  USING (true);

CREATE POLICY "Service role full access import log"
  ON data_import_log FOR ALL
  TO service_role
  USING (true);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_technical_indicators TO service_role;
GRANT EXECUTE ON FUNCTION get_training_batch TO authenticated, service_role;

-- Comments
COMMENT ON TABLE historical_market_data IS 'Raw OHLCV data from OANDA for ML training';
COMMENT ON TABLE training_labels IS 'Backtest results used as supervised labels for RL training';
COMMENT ON TABLE backtest_runs IS 'Metadata for backtest execution runs';
COMMENT ON TABLE data_import_log IS 'Tracks OANDA data import job status';
COMMENT ON VIEW training_data_summary IS 'Summary statistics for historical market data';
COMMENT ON VIEW training_labels_summary IS 'Summary statistics for training labels';
COMMENT ON FUNCTION get_training_batch IS 'Returns a randomized batch of training samples';
