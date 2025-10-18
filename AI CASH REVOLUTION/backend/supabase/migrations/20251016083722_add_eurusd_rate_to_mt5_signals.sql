-- Add eurusd_rate column to mt5_signals table
ALTER TABLE mt5_signals
ADD COLUMN IF NOT EXISTS eurusd_rate DECIMAL(10, 5) DEFAULT NULL;

-- Add comment to column
COMMENT ON COLUMN mt5_signals.eurusd_rate IS 'Tasso di cambio EUR/USD da OANDA al momento del segnale';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_mt5_signals_eurusd_rate ON mt5_signals(eurusd_rate);
