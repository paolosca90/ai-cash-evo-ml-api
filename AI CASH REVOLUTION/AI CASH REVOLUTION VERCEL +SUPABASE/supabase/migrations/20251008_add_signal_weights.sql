-- Add Signal Weight Columns
-- Adds calculated weight, recommendation, and position multiplier to ml_historical_candles

-- Add weight columns
ALTER TABLE ml_historical_candles 
ADD COLUMN IF NOT EXISTS signal_weight DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS signal_recommendation VARCHAR(20),
ADD COLUMN IF NOT EXISTS position_multiplier DECIMAL(3,2);

-- Add indexes for filtering by weight/recommendation
CREATE INDEX IF NOT EXISTS idx_ml_candles_signal_weight 
ON ml_historical_candles(signal_weight DESC) 
WHERE signal_weight IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ml_candles_recommendation 
ON ml_historical_candles(signal_recommendation) 
WHERE signal_recommendation IS NOT NULL;

-- Add check constraint for valid weight range
ALTER TABLE ml_historical_candles
ADD CONSTRAINT check_signal_weight_range 
CHECK (signal_weight IS NULL OR (signal_weight >= 0 AND signal_weight <= 100));

-- Add check constraint for position multiplier range
ALTER TABLE ml_historical_candles
ADD CONSTRAINT check_position_multiplier_range 
CHECK (position_multiplier IS NULL OR (position_multiplier >= 0.25 AND position_multiplier <= 2.0));

-- Comments
COMMENT ON COLUMN ml_historical_candles.signal_weight IS 'Calculated signal weight (0-100) combining ML confidence, technical quality, market conditions, MTF confirmation, and risk factors';
COMMENT ON COLUMN ml_historical_candles.signal_recommendation IS 'Trading recommendation: STRONG_BUY, BUY, WEAK, or AVOID';
COMMENT ON COLUMN ml_historical_candles.position_multiplier IS 'Position size multiplier (0.25-2.0) based on signal weight';
