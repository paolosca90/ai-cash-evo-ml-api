-- Add processed column to mt5_signals table
-- This column tracks whether a signal has been processed by the EA

ALTER TABLE mt5_signals
ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_mt5_signals_processed ON mt5_signals(processed);

-- Add comment for documentation
COMMENT ON COLUMN mt5_signals.processed IS 'Tracks whether the signal has been processed by the MT5 EA';