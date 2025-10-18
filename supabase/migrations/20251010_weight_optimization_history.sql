-- Weight Optimization History
-- Stores monthly weight optimization results

CREATE TABLE IF NOT EXISTS weight_optimization_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Optimal configuration
  optimal_threshold DECIMAL NOT NULL,

  -- Performance metrics
  performance_winrate DECIMAL NOT NULL,
  performance_avg_pips DECIMAL NOT NULL,
  qualified_signals INT NOT NULL,
  total_signals INT NOT NULL,

  -- BUY signals stats
  buy_count INT DEFAULT 0,
  buy_winrate DECIMAL DEFAULT 0,
  buy_avg_pips DECIMAL DEFAULT 0,

  -- SELL signals stats
  sell_count INT DEFAULT 0,
  sell_winrate DECIMAL DEFAULT 0,
  sell_avg_pips DECIMAL DEFAULT 0,

  -- All thresholds tested
  all_thresholds JSONB,

  -- Active flag (only one active at a time)
  active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup of active config
CREATE INDEX IF NOT EXISTS idx_weight_optimization_active
  ON weight_optimization_history(active, timestamp DESC);

-- Function to get current optimal threshold
CREATE OR REPLACE FUNCTION get_optimal_threshold()
RETURNS DECIMAL AS $$
DECLARE
  threshold DECIMAL;
BEGIN
  SELECT optimal_threshold INTO threshold
  FROM weight_optimization_history
  WHERE active = TRUE
  ORDER BY timestamp DESC
  LIMIT 1;

  RETURN COALESCE(threshold, 70.0); -- Default to 70 if no optimization yet
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON weight_optimization_history TO service_role;
GRANT EXECUTE ON FUNCTION get_optimal_threshold TO service_role;

COMMENT ON TABLE weight_optimization_history IS 'Stores monthly signal weight optimization results';
COMMENT ON FUNCTION get_optimal_threshold IS 'Returns the current active optimal threshold';
