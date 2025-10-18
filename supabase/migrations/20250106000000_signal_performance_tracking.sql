-- Signal Performance Tracking for Ensemble System
-- Tracks performance of Classic, ML, and Ensemble signals

-- Signal performance table
CREATE TABLE IF NOT EXISTS signal_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('classic', 'ml', 'ensemble')),

  -- Prediction data
  predicted_direction TEXT NOT NULL CHECK (predicted_direction IN ('BUY', 'SELL', 'HOLD')),
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  entry_price FLOAT NOT NULL,
  stop_loss FLOAT,
  take_profit FLOAT,

  -- ML-specific data
  ml_action TEXT,
  ml_confidence FLOAT,
  ml_uncertainty JSONB,  -- {epistemic, aleatoric, total}
  ml_recommendation TEXT,  -- BOOST, MAINTAIN, REDUCE, BLOCK
  agreement BOOLEAN,  -- Did classic and ML agree?

  -- Actual result
  actual_result FLOAT,  -- P&L in pips or percentage
  actual_direction TEXT CHECK (actual_direction IN ('BUY', 'SELL', 'HOLD', 'NONE')),
  win BOOLEAN,  -- Did the prediction win?
  result_timestamp TIMESTAMPTZ,

  -- Metadata
  session_type TEXT,
  market_regime TEXT,
  volatility_level TEXT,
  news_impact TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_signal_performance_symbol ON signal_performance(symbol);
CREATE INDEX IF NOT EXISTS idx_signal_performance_type ON signal_performance(signal_type);
CREATE INDEX IF NOT EXISTS idx_signal_performance_timestamp ON signal_performance(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_performance_win ON signal_performance(win) WHERE win IS NOT NULL;

-- Performance analytics view
CREATE OR REPLACE VIEW signal_performance_analytics AS
SELECT
  symbol,
  signal_type,
  COUNT(*) as total_signals,
  COUNT(*) FILTER (WHERE win = true) as wins,
  COUNT(*) FILTER (WHERE win = false) as losses,
  ROUND(
    ((COUNT(*) FILTER (WHERE win = true)::FLOAT / NULLIF(COUNT(*) FILTER (WHERE win IS NOT NULL), 0)) * 100)::NUMERIC,
    2
  ) as win_rate_percent,
  ROUND(AVG(confidence)::NUMERIC, 2) as avg_confidence,
  ROUND(AVG(actual_result)::NUMERIC, 2) as avg_pnl,
  ROUND(SUM(actual_result)::NUMERIC, 2) as total_pnl,
  ROUND(STDDEV(actual_result)::NUMERIC, 2) as pnl_stddev,
  -- Sharpe-like ratio (simplified)
  CASE
    WHEN STDDEV(actual_result) > 0 THEN
      ROUND((AVG(actual_result) / STDDEV(actual_result))::NUMERIC, 2)
    ELSE 0
  END as sharpe_ratio
FROM signal_performance
WHERE win IS NOT NULL  -- Only completed signals
GROUP BY symbol, signal_type
ORDER BY symbol, signal_type;

-- Symbol-specific weights for ensemble
CREATE TABLE IF NOT EXISTS ensemble_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,

  -- Dynamic weights (0-1, sum to 1)
  classic_weight FLOAT NOT NULL DEFAULT 0.5 CHECK (classic_weight >= 0 AND classic_weight <= 1),
  ml_weight FLOAT NOT NULL DEFAULT 0.5 CHECK (ml_weight >= 0 AND ml_weight <= 1),

  -- Performance metrics used to calculate weights
  classic_win_rate FLOAT DEFAULT 0.5,
  ml_win_rate FLOAT DEFAULT 0.5,
  classic_sharpe FLOAT DEFAULT 0,
  ml_sharpe FLOAT DEFAULT 0,

  -- Recalculation metadata
  last_recalculated TIMESTAMPTZ DEFAULT now(),
  sample_size INT DEFAULT 0,  -- Number of trades used for calculation

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraint: weights must sum to 1
  CONSTRAINT weights_sum_to_one CHECK (ABS(classic_weight + ml_weight - 1.0) < 0.001)
);

-- Function to recalculate weights for a symbol
CREATE OR REPLACE FUNCTION recalculate_ensemble_weights(p_symbol TEXT)
RETURNS TABLE(
  symbol TEXT,
  classic_weight FLOAT,
  ml_weight FLOAT,
  classic_win_rate FLOAT,
  ml_win_rate FLOAT
) AS $$
DECLARE
  v_classic_wr FLOAT;
  v_ml_wr FLOAT;
  v_classic_sharpe FLOAT;
  v_ml_sharpe FLOAT;
  v_sample_size INT;
  v_new_classic_weight FLOAT;
  v_new_ml_weight FLOAT;
BEGIN
  -- Get performance metrics for last 50 trades
  SELECT
    COALESCE(
      (SELECT
        COUNT(*) FILTER (WHERE win = true)::FLOAT / NULLIF(COUNT(*), 0)
       FROM signal_performance
       WHERE signal_performance.symbol = p_symbol
         AND signal_type = 'classic'
         AND win IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 50),
      0.5
    ),
    COALESCE(
      (SELECT
        COUNT(*) FILTER (WHERE win = true)::FLOAT / NULLIF(COUNT(*), 0)
       FROM signal_performance
       WHERE signal_performance.symbol = p_symbol
         AND signal_type = 'ml'
         AND win IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 50),
      0.5
    ),
    COALESCE(
      (SELECT
        AVG(actual_result) / NULLIF(STDDEV(actual_result), 0)
       FROM signal_performance
       WHERE signal_performance.symbol = p_symbol
         AND signal_type = 'classic'
         AND win IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 50),
      0
    ),
    COALESCE(
      (SELECT
        AVG(actual_result) / NULLIF(STDDEV(actual_result), 0)
       FROM signal_performance
       WHERE signal_performance.symbol = p_symbol
         AND signal_type = 'ml'
         AND win IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 50),
      0
    ),
    (SELECT COUNT(*)
     FROM signal_performance
     WHERE signal_performance.symbol = p_symbol
       AND win IS NOT NULL)
  INTO v_classic_wr, v_ml_wr, v_classic_sharpe, v_ml_sharpe, v_sample_size;

  -- Calculate weights based on win rates (simple approach)
  IF v_classic_wr + v_ml_wr > 0 THEN
    v_new_classic_weight := v_classic_wr / (v_classic_wr + v_ml_wr);
    v_new_ml_weight := v_ml_wr / (v_classic_wr + v_ml_wr);
  ELSE
    v_new_classic_weight := 0.5;
    v_new_ml_weight := 0.5;
  END IF;

  -- Upsert weights
  INSERT INTO ensemble_weights (
    symbol,
    classic_weight,
    ml_weight,
    classic_win_rate,
    ml_win_rate,
    classic_sharpe,
    ml_sharpe,
    sample_size,
    last_recalculated
  ) VALUES (
    p_symbol,
    v_new_classic_weight,
    v_new_ml_weight,
    v_classic_wr,
    v_ml_wr,
    v_classic_sharpe,
    v_ml_sharpe,
    v_sample_size,
    now()
  )
  ON CONFLICT (symbol) DO UPDATE SET
    classic_weight = v_new_classic_weight,
    ml_weight = v_new_ml_weight,
    classic_win_rate = v_classic_wr,
    ml_win_rate = v_ml_wr,
    classic_sharpe = v_classic_sharpe,
    ml_sharpe = v_ml_sharpe,
    sample_size = v_sample_size,
    last_recalculated = now(),
    updated_at = now();

  -- Return result
  RETURN QUERY
  SELECT
    ensemble_weights.symbol,
    ensemble_weights.classic_weight,
    ensemble_weights.ml_weight,
    ensemble_weights.classic_win_rate,
    ensemble_weights.ml_win_rate
  FROM ensemble_weights
  WHERE ensemble_weights.symbol = p_symbol;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-recalculate weights every 10 trades
CREATE OR REPLACE FUNCTION trigger_recalculate_weights()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if we have 10+ completed trades for this symbol
  IF (SELECT COUNT(*)
      FROM signal_performance
      WHERE symbol = NEW.symbol
        AND win IS NOT NULL) % 10 = 0 THEN

    -- Recalculate weights
    PERFORM recalculate_ensemble_weights(NEW.symbol);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_recalculate_ensemble_weights ON signal_performance;

CREATE TRIGGER auto_recalculate_ensemble_weights
AFTER INSERT OR UPDATE ON signal_performance
FOR EACH ROW
WHEN (NEW.win IS NOT NULL)
EXECUTE FUNCTION trigger_recalculate_weights();

-- RLS policies
ALTER TABLE signal_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ensemble_weights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to all users" ON signal_performance;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON signal_performance;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON signal_performance;
DROP POLICY IF EXISTS "Allow read access to weights" ON ensemble_weights;
DROP POLICY IF EXISTS "Allow system to manage weights" ON ensemble_weights;

CREATE POLICY "Allow read access to all users" ON signal_performance FOR SELECT USING (true);
CREATE POLICY "Allow insert for authenticated users" ON signal_performance FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');
CREATE POLICY "Allow update for authenticated users" ON signal_performance FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "Allow read access to weights" ON ensemble_weights FOR SELECT USING (true);
CREATE POLICY "Allow system to manage weights" ON ensemble_weights FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE signal_performance IS 'Tracks performance of trading signals for ensemble learning';
COMMENT ON TABLE ensemble_weights IS 'Dynamic weights for ensemble voting per symbol';
COMMENT ON FUNCTION recalculate_ensemble_weights IS 'Recalculates ensemble weights based on recent performance';
