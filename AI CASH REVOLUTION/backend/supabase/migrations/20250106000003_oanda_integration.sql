-- Add OANDA trade tracking to signal_performance
ALTER TABLE signal_performance
ADD COLUMN IF NOT EXISTS external_trade_id TEXT,
ADD COLUMN IF NOT EXISTS oanda_trade_closed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_signal_performance_oanda_trade
ON signal_performance(external_trade_id) WHERE external_trade_id IS NOT NULL;

COMMENT ON COLUMN signal_performance.external_trade_id IS 'OANDA trade ID for tracking';
COMMENT ON COLUMN signal_performance.oanda_trade_closed_at IS 'When OANDA trade was closed';
