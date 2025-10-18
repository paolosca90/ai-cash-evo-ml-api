-- Add signal weight columns to signal_performance table
-- This enables weight tracking for continuous learning system

-- Add weight columns
ALTER TABLE signal_performance
ADD COLUMN IF NOT EXISTS signal_weight DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS signal_recommendation VARCHAR(20),
ADD COLUMN IF NOT EXISTS position_multiplier DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS weight_components JSONB;

-- Add comments
COMMENT ON COLUMN signal_performance.signal_weight IS 'Comprehensive signal weight (0-100) from 5-component formula';
COMMENT ON COLUMN signal_performance.signal_recommendation IS 'Trading recommendation: STRONG_BUY, BUY, WEAK, or AVOID';
COMMENT ON COLUMN signal_performance.position_multiplier IS 'Position size multiplier (0.25-2.0) based on signal weight';
COMMENT ON COLUMN signal_performance.weight_components IS 'Weight breakdown: ml_confidence, technical_quality, market_conditions, mtf_confirmation, risk_factors';

-- Add constraints (with IF NOT EXISTS workaround)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_sp_signal_weight_range'
  ) THEN
    ALTER TABLE signal_performance
    ADD CONSTRAINT check_sp_signal_weight_range
    CHECK (signal_weight IS NULL OR (signal_weight >= 0 AND signal_weight <= 100));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_sp_position_multiplier_range'
  ) THEN
    ALTER TABLE signal_performance
    ADD CONSTRAINT check_sp_position_multiplier_range
    CHECK (position_multiplier IS NULL OR (position_multiplier >= 0.25 AND position_multiplier <= 2.0));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_sp_signal_recommendation_values'
  ) THEN
    ALTER TABLE signal_performance
    ADD CONSTRAINT check_sp_signal_recommendation_values
    CHECK (signal_recommendation IS NULL OR signal_recommendation IN ('STRONG_BUY', 'BUY', 'WEAK', 'AVOID'));
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_signal_performance_weight
ON signal_performance(signal_weight DESC)
WHERE signal_weight IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_signal_performance_recommendation
ON signal_performance(signal_recommendation)
WHERE signal_recommendation IS NOT NULL;

-- Update signal_type check constraint to include new types
ALTER TABLE signal_performance
DROP CONSTRAINT IF EXISTS signal_performance_signal_type_check;

ALTER TABLE signal_performance
ADD CONSTRAINT signal_performance_signal_type_check
CHECK (signal_type IN ('classic', 'ml', 'ensemble', 'adaptive_v3', 'weighted'));

-- Add external_trade_id if not exists (for OANDA tracking)
ALTER TABLE signal_performance
ADD COLUMN IF NOT EXISTS external_trade_id TEXT;

CREATE INDEX IF NOT EXISTS idx_signal_performance_external_trade
ON signal_performance(external_trade_id)
WHERE external_trade_id IS NOT NULL;

COMMENT ON COLUMN signal_performance.external_trade_id IS 'OANDA trade ID for tracking real trades';

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Signal weight columns added to signal_performance table';
  RAISE NOTICE 'Auto-trading system now includes weight filtering';
  RAISE NOTICE 'Only signals with weight >= 70 will be executed';
END $$;
