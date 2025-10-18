-- Signal Metadata Table
CREATE TABLE IF NOT EXISTS public.signal_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- Basic signal information
    signal_id UUID NOT NULL REFERENCES public.mt5_signals(id) ON DELETE CASCADE,
    signal_type TEXT NOT NULL CHECK (signal_type IN ('buy', 'sell', 'hold', 'close_long', 'close_short', 'modify_stop', 'modify_target')),
    signal_category TEXT NOT NULL CHECK (signal_category IN ('trend_following', 'mean_reversion', 'breakout', 'reversal', 'momentum', 'volatility', 'arbitrage')),
    confidence_level DECIMAL(5,2) NOT NULL CHECK (confidence_level >= 0 AND confidence_level <= 100),

    -- AI/ML Model information
    ai_model_name TEXT NOT NULL,
    ai_model_version TEXT NOT NULL,
    ai_confidence_score DECIMAL(5,2) NOT NULL CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 100),
    ai_reasoning TEXT,
    ai_feature_importance JSONB DEFAULT '{}',
    ai_prediction_probabilities JSONB DEFAULT '{}',

    -- Technical indicators used
    indicators_used JSONB DEFAULT '[]', -- Array of indicator names and values
    primary_indicator TEXT, -- Main indicator driving the signal
    secondary_indicators TEXT[] DEFAULT '{}', -- Supporting indicators
    indicator_weights JSONB DEFAULT '{}', -- Weight of each indicator in decision

    -- Pattern recognition
    detected_patterns TEXT[] DEFAULT '{}', -- Array of pattern names
    pattern_strength DECIMAL(5,2) DEFAULT 0, -- Overall pattern confidence
    pattern_timeframes TEXT[] DEFAULT '{}', -- Timeframes where patterns were detected

    -- Market structure analysis
    market_structure TEXT DEFAULT 'unknown' CHECK (market_structure IN ('impulse', 'correction', 'consolidation', 'breakout', 'reversal', 'unknown')),
    structure_strength DECIMAL(5,2) DEFAULT 0,
    higher_timeframe_trend TEXT DEFAULT 'unknown' CHECK (higher_timeframe_trend IN ('bullish', 'bearish', 'sideways', 'unknown')),
    lower_timeframe_trend TEXT DEFAULT 'unknown' CHECK (lower_timeframe_trend IN ('bullish', 'bearish', 'sideways', 'unknown')),

    -- Volume analysis
    volume_analysis JSONB DEFAULT '{}', -- Volume profile, spike analysis, etc.
    volume_confirmation BOOLEAN DEFAULT false,
    volume_strength DECIMAL(5,2) DEFAULT 0,

    -- Risk assessment
    risk_score DECIMAL(5,2) DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_factors TEXT[] DEFAULT '{}', -- Array of risk factors
    risk_category TEXT DEFAULT 'moderate' CHECK (risk_category IN ('low', 'moderate', 'high', 'extreme')),

    -- Signal validation
    validation_checks JSONB DEFAULT '{}', -- Results of various validation checks
    validation_score DECIMAL(5,2) DEFAULT 0,
    is_validated BOOLEAN DEFAULT false,
    validated_by TEXT, -- AI system or manual validation

    -- Signal evolution
    evolution_history JSONB DEFAULT '[]', -- Track how signal evolved over time
    confidence_trajectory JSONB DEFAULT '{}', -- Confidence changes over time
    last_modified TIMESTAMP WITH TIME ZONE DEFAULT now(),

    -- Metadata
    processing_time_ms INTEGER DEFAULT 0, -- Time taken to generate signal
    data_sources_used TEXT[] DEFAULT '{}', -- Data sources consulted
    algorithm_parameters JSONB DEFAULT '{}', -- Algorithm parameters used
    custom_metadata JSONB DEFAULT '{}' -- Additional custom metadata
);

-- Indexes for signal_metadata
CREATE INDEX IF NOT EXISTS idx_signal_metadata_signal_id ON public.signal_metadata(signal_id);
CREATE INDEX IF NOT EXISTS idx_signal_metadata_signal_type ON public.signal_metadata(signal_type);
CREATE INDEX IF NOT EXISTS idx_signal_metadata_ai_model ON public.signal_metadata(ai_model_name);
CREATE INDEX IF NOT EXISTS idx_signal_metadata_confidence ON public.signal_metadata(confidence_level DESC);
CREATE INDEX IF NOT EXISTS idx_signal_metadata_created_at ON public.signal_metadata(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signal_metadata_market_structure ON public.signal_metadata(market_structure);
CREATE INDEX IF NOT EXISTS idx_signal_metadata_patterns ON public.signal_metadata USING GIN(detected_patterns);
CREATE INDEX IF NOT EXISTS idx_signal_metadata_indicators ON public.signal_metadata USING GIN(indicators_used);

-- Enable Row Level Security
ALTER TABLE public.signal_metadata ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Signal metadata readable by authenticated users"
ON public.signal_metadata
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Signal metadata manageable by users"
ON public.signal_metadata
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.mt5_signals ms
        WHERE ms.id = signal_metadata.signal_id
        AND ms.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.mt5_signals ms
        WHERE ms.id = signal_metadata.signal_id
        AND ms.user_id = auth.uid()
    )
);

-- Trigger for updated_at
CREATE TRIGGER update_signal_metadata_updated_at
    BEFORE UPDATE ON public.signal_metadata
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger to validate signal metadata
CREATE OR REPLACE FUNCTION validate_signal_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Validate that confidence level is within bounds
    IF NEW.confidence_level < 0 OR NEW.confidence_level > 100 THEN
        RAISE EXCEPTION 'Confidence level must be between 0 and 100';
    END IF;

    -- Validate AI confidence score
    IF NEW.ai_confidence_score < 0 OR NEW.ai_confidence_score > 100 THEN
        RAISE EXCEPTION 'AI confidence score must be between 0 and 100';
    END IF;

    -- Validate risk score
    IF NEW.risk_score < 0 OR NEW.risk_score > 100 THEN
        RAISE EXCEPTION 'Risk score must be between 0 and 100';
    END IF;

    -- Update last_modified timestamp
    NEW.last_modified = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER validate_signal_metadata_trigger
    BEFORE INSERT OR UPDATE ON public.signal_metadata
    FOR EACH ROW
    EXECUTE FUNCTION validate_signal_metadata();

-- Comment for documentation
COMMENT ON TABLE public.signal_metadata IS 'Comprehensive metadata for AI-generated trading signals including model information, technical indicators, and validation data';