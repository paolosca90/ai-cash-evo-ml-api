-- Add ML confirmation fields to mt5_signals table
-- This creates the dual-component architecture where ML confirms existing signals

-- Add ML confirmation fields
ALTER TABLE mt5_signals
ADD COLUMN IF NOT EXISTS ml_confidence INTEGER,
ADD COLUMN IF NOT EXISTS ml_status TEXT DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS ml_weight_score NUMERIC,
ADD COLUMN IF NOT EXISTS ml_analysis JSONB,
ADD COLUMN IF NOT EXISTS ml_processed_at TIMESTAMPTZ;

-- Add index for ML processing performance
CREATE INDEX IF NOT EXISTS idx_mt5_signals_ml_status
ON mt5_signals(ml_status, timestamp DESC);

-- Add index for ML confidence filtering
CREATE INDEX IF NOT EXISTS idx_mt5_signals_ml_confidence
ON mt5_signals(ml_confidence DESC) WHERE ml_confidence IS NOT NULL;

-- Add comment explaining the fields
COMMENT ON COLUMN mt5_signals.ml_confidence IS 'ML-calculated confidence score (0-100) using optimized weights';
COMMENT ON COLUMN mt5_signals.ml_status IS 'ML processing status: PENDING, CONFIRMED, REJECTED, INSUFFICIENT_DATA';
COMMENT ON COLUMN mt5_signals.ml_weight_score IS 'Raw weighted score from ML indicators calculation';
COMMENT ON COLUMN mt5_signals.ml_analysis IS 'Detailed ML analysis including indicator weights and scoring breakdown';
COMMENT ON COLUMN mt5_signals.ml_processed_at IS 'Timestamp when ML processing was completed';

-- Create view for ML-confirmed signals only
CREATE OR REPLACE VIEW ml_confirmed_signals AS
SELECT
  id,
  client_id,
  symbol,
  signal,
  entry,
  stop_loss,
  take_profit,
  confidence as base_confidence,
  ml_confidence,
  ml_status,
  ml_weight_score,
  risk_amount,
  timestamp,
  ai_analysis,
  ml_analysis,
  created_at,
  -- Calculate combined confidence score
  CASE
    WHEN ml_confidence IS NOT NULL AND ml_status = 'CONFIRMED' THEN
      GREATEST(confidence, ml_confidence)
    ELSE confidence
  END as effective_confidence
FROM mt5_signals
WHERE processed = false
  AND (ml_status = 'CONFIRMED' OR ml_status IS NULL OR ml_status = 'PENDING')
ORDER BY timestamp DESC;

-- Create function to check if ML has sufficient data to make reliable predictions
CREATE OR REPLACE FUNCTION has_sufficient_ml_data()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  min_samples_needed INTEGER := 100;
  current_samples INTEGER;
BEGIN
  -- Count completed training samples (trade results available)
  SELECT COUNT(*) INTO current_samples
  FROM ml_training_samples
  WHERE status IN ('SL_HIT', 'TP_HIT')
    AND created_at > NOW() - INTERVAL '30 days';

  -- Return true if we have enough samples
  RETURN current_samples >= min_samples_needed;
END;
$$;

-- Grant permissions
GRANT SELECT ON ml_confirmed_signals TO authenticated;
GRANT EXECUTE ON FUNCTION has_sufficient_ml_data TO authenticated;