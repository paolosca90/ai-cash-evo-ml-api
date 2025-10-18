-- Add ML optimization columns to mt5_signals table
ALTER TABLE public.mt5_signals
ADD COLUMN IF NOT EXISTS ml_confidence_score FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS optimized_parameters JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS pattern_detected TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS execution_latency_ms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS batch_update_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_tick_timestamp TIMESTAMP WITH TIME ZONE;

-- Create index for better performance on ML queries
CREATE INDEX IF NOT EXISTS idx_mt5_signals_ml_confidence 
ON public.mt5_signals(ml_confidence_score) 
WHERE ml_confidence_score > 0;

CREATE INDEX IF NOT EXISTS idx_mt5_signals_pattern 
ON public.mt5_signals(pattern_detected) 
WHERE pattern_detected != '';

CREATE INDEX IF NOT EXISTS idx_mt5_signals_last_tick 
ON public.mt5_signals(last_tick_timestamp) 
WHERE last_tick_timestamp IS NOT NULL;