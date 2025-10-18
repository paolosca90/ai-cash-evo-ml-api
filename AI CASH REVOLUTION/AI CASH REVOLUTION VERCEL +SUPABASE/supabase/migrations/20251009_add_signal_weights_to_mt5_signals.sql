-- Add signal weight columns to mt5_signals table
-- This enables real-time signal weight calculation and filtering

-- Add signal weight columns
ALTER TABLE public.mt5_signals
ADD COLUMN IF NOT EXISTS signal_weight DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS signal_recommendation VARCHAR(20),
ADD COLUMN IF NOT EXISTS position_multiplier DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS weight_components JSONB;

-- Add comments for documentation
COMMENT ON COLUMN public.mt5_signals.signal_weight IS 'Comprehensive signal weight (0-100) calculated from 5 components';
COMMENT ON COLUMN public.mt5_signals.signal_recommendation IS 'Trading recommendation: STRONG_BUY, BUY, WEAK, or AVOID';
COMMENT ON COLUMN public.mt5_signals.position_multiplier IS 'Position size multiplier based on signal weight (0.25-2.0)';
COMMENT ON COLUMN public.mt5_signals.weight_components IS 'Breakdown of weight calculation: ml_confidence, technical_quality, market_conditions, mtf_confirmation, risk_factors';

-- Add check constraints
ALTER TABLE public.mt5_signals
ADD CONSTRAINT check_signal_weight_range
CHECK (signal_weight IS NULL OR (signal_weight >= 0 AND signal_weight <= 100));

ALTER TABLE public.mt5_signals
ADD CONSTRAINT check_position_multiplier_range
CHECK (position_multiplier IS NULL OR (position_multiplier >= 0.25 AND position_multiplier <= 2.0));

ALTER TABLE public.mt5_signals
ADD CONSTRAINT check_signal_recommendation_values
CHECK (signal_recommendation IS NULL OR signal_recommendation IN ('STRONG_BUY', 'BUY', 'WEAK', 'AVOID'));

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_mt5_signals_weight
ON public.mt5_signals(signal_weight DESC)
WHERE signal_weight IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mt5_signals_recommendation
ON public.mt5_signals(signal_recommendation)
WHERE signal_recommendation IS NOT NULL;

-- Composite index for common query pattern (weight + status)
CREATE INDEX IF NOT EXISTS idx_mt5_signals_weight_status
ON public.mt5_signals(signal_weight DESC, status)
WHERE signal_weight IS NOT NULL AND status IS NOT NULL;

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Signal weight columns added to mt5_signals table';
  RAISE NOTICE 'Indexes created for efficient filtering';
  RAISE NOTICE 'New signals will include real-time weight calculation';
END $$;
