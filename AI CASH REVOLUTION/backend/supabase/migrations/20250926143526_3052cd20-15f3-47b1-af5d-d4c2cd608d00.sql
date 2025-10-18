-- Create table for optimized ML/AI trading signals
CREATE TABLE public.ml_optimized_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signal_id UUID REFERENCES public.mt5_signals(id) ON DELETE CASCADE,
    
    -- Basic signal info
    symbol TEXT NOT NULL,
    signal_type TEXT NOT NULL, -- BUY/SELL
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Timing features (normalized)
    market_session TEXT NOT NULL, -- LONDON/NY/ASIAN/OVERLAP
    hour_of_day INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    is_news_time BOOLEAN DEFAULT false,
    time_to_major_news_minutes INTEGER,
    
    -- Technical features (normalized 0-1)
    rsi_normalized DECIMAL(5,4),
    macd_normalized DECIMAL(5,4),
    atr_percent_normalized DECIMAL(5,4),
    volume_ratio_normalized DECIMAL(5,4),
    volatility_rank DECIMAL(5,4),
    
    -- Smart Money features
    institutional_bias TEXT, -- BULLISH/BEARISH/NEUTRAL
    session_bias TEXT,
    has_choc BOOLEAN DEFAULT false,
    has_bos BOOLEAN DEFAULT false,
    liquidity_swept BOOLEAN DEFAULT false,
    market_structure_score DECIMAL(5,4),
    
    -- Multi-timeframe features
    m15_trend TEXT, -- UP/DOWN/SIDEWAYS
    m5_area TEXT,   -- DEMAND/SUPPLY/NEUTRAL
    m1_entry_quality DECIMAL(5,4),
    trend_alignment_score DECIMAL(5,4),
    
    -- News sentiment features
    news_sentiment_score DECIMAL(6,4), -- -1 to +1
    news_impact_score DECIMAL(5,4),    -- 0 to 1
    relevant_news_count INTEGER DEFAULT 0,
    
    -- Price action features (normalized)
    price_position_in_range DECIMAL(5,4), -- 0=bottom, 1=top
    distance_from_support DECIMAL(6,4),
    distance_from_resistance DECIMAL(6,4),
    breakout_strength DECIMAL(5,4),
    
    -- Risk metrics (normalized)
    risk_reward_ratio DECIMAL(6,4),
    confidence_score DECIMAL(5,4), -- 0-1
    win_probability DECIMAL(5,4),  -- 0-1 (calculated)
    
    -- Outcome (for learning)
    actual_outcome TEXT, -- WIN/LOSS/PENDING
    actual_profit_pips DECIMAL(10,4),
    actual_profit_percent DECIMAL(8,4),
    max_favorable_excursion DECIMAL(8,4),
    max_adverse_excursion DECIMAL(8,4),
    trade_duration_minutes INTEGER,
    
    -- ML Features vector (JSON for complex features)
    feature_vector JSONB,
    
    -- Meta
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ml_optimized_signals ENABLE ROW LEVEL SECURITY;

-- Create policy for admins only (ML data is sensitive)
CREATE POLICY "Only admins can access ML optimized signals" 
ON public.ml_optimized_signals 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for ML queries
CREATE INDEX idx_ml_signals_symbol_timestamp ON public.ml_optimized_signals(symbol, timestamp DESC);
CREATE INDEX idx_ml_signals_outcome ON public.ml_optimized_signals(actual_outcome);
CREATE INDEX idx_ml_signals_market_session ON public.ml_optimized_signals(market_session);
CREATE INDEX idx_ml_signals_confidence ON public.ml_optimized_signals(confidence_score);

-- Add trigger for updated_at
CREATE TRIGGER update_ml_optimized_signals_updated_at
BEFORE UPDATE ON public.ml_optimized_signals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();