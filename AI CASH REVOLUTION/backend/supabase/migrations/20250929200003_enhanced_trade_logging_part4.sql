-- Market Context Table
CREATE TABLE IF NOT EXISTS public.market_context (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- Basic context info
    signal_id UUID NOT NULL REFERENCES public.mt5_signals(id) ON DELETE CASCADE,
    context_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    symbol TEXT NOT NULL,

    -- Market regime identification
    market_regime TEXT NOT NULL CHECK (market_regime IN ('trending_up', 'trending_down', 'ranging', 'volatile', 'quiet', 'breakout_bullish', 'breakout_bearish', 'reversal_bullish', 'reversal_bearish', 'unknown')),
    regime_confidence DECIMAL(5,2) DEFAULT 0 CHECK (regime_confidence >= 0 AND regime_confidence <= 100),
    regime_duration_minutes INTEGER DEFAULT 0, -- How long this regime has been active
    expected_regime_duration_minutes INTEGER DEFAULT 0, -- Expected remaining duration

    -- Volatility analysis
    volatility_state TEXT NOT NULL CHECK (volatility_state IN ('low', 'normal', 'high', 'extreme', 'expanding', 'contracting')),
    current_volatility DECIMAL(15,8) DEFAULT 0,
    average_volatility DECIMAL(15,8) DEFAULT 0,
    volatility_percentile DECIMAL(5,2) DEFAULT 0, -- Current volatility vs historical
    atr_value DECIMAL(15,8) DEFAULT 0, -- Average True Range
    atr_percentile DECIMAL(5,2) DEFAULT 0,
    volatility_trend TEXT DEFAULT 'stable' CHECK (volatility_trend IN ('increasing', 'stable', 'decreasing')),

    -- Trading session information
    session_info TEXT NOT NULL CHECK (session_info IN ('asia', 'london', 'new_york', 'london_new_york_overlap', 'asia_london_overlap', 'weekend', 'holiday', 'unknown')),
    session_phase TEXT DEFAULT 'opening' CHECK (session_phase IN ('opening', 'mid_session', 'closing', 'overlap_start', 'overlap_end')),
    session_intensity DECIMAL(5,2) DEFAULT 0 CHECK (session_intensity >= 0 AND session_intensity <= 100),
    is_major_session BOOLEAN DEFAULT false,
    session_start_time TIMESTAMP WITH TIME ZONE,
    session_end_time TIMESTAMP WITH TIME ZONE,

    -- Liquidity conditions
    liquidity_conditions TEXT NOT NULL CHECK (liquidity_conditions IN ('low', 'normal', 'high', 'thin', 'excess', 'drying_up')),
    liquidity_score DECIMAL(5,2) DEFAULT 0 CHECK (liquidity_score >= 0 AND liquidity_score <= 100),
    spread_value DECIMAL(15,8) DEFAULT 0,
    spread_percentile DECIMAL(5,2) DEFAULT 0,
    depth_of_market JSONB DEFAULT '{}', -- Order book depth information
    liquidity_providers_count INTEGER DEFAULT 0,
    market_depth_score DECIMAL(5,2) DEFAULT 0,

    -- Economic calendar impact
    news_impact_level TEXT DEFAULT 'low' CHECK (news_impact_level IN ('none', 'low', 'medium', 'high', 'extreme')),
    upcoming_high_impact_news INTEGER DEFAULT 0, -- Count of upcoming high-impact news
    recent_news_sentiment DECIMAL(5,2) DEFAULT -100, -- Sentiment from recent news (-100 to 100)
    news_time_horizon_minutes INTEGER DEFAULT 60, -- Time horizon for news consideration
    economic_event_ids TEXT[] DEFAULT '{}', -- IDs of relevant economic events

    -- Market microstructure
    order_flow_imbalance DECIMAL(5,2) DEFAULT 0, -- -100 to 100 (buy/sell imbalance)
    tick_direction_bias TEXT DEFAULT 'neutral' CHECK (tick_direction_bias IN ('bullish', 'bearish', 'neutral')),
    market_efficiency DECIMAL(5,2) DEFAULT 0, -- How efficient the market is (0-100)
    price_discovery_quality DECIMAL(5,2) DEFAULT 0, -- Quality of price discovery
    information_flow JSONB DEFAULT '{}', -- Flow of market information

    -- Institutional activity
    institutional_activity_level TEXT DEFAULT 'normal' CHECK (institutional_activity_level IN ('low', 'normal', 'high', 'extreme')),
    institutional_net_position TEXT DEFAULT 'neutral' CHECK (institutional_net_position IN ('long', 'short', 'neutral')),
    smart_money_flow DECIMAL(5,2) DEFAULT 0, -100 to 100
    large_player_activity BOOLEAN DEFAULT false,
    dark_pool_volume_ratio DECIMAL(5,2) DEFAULT 0,

    -- Technical context
    support_resistance_levels JSONB DEFAULT '{}', -- Key support and resistance levels
    pivot_points JSONB DEFAULT '{}', -- Pivot point calculations
    fibonacci_levels JSONB DEFAULT '{}', -- Fibonacci retracement/extension levels
    market_profile JSONB DEFAULT '{}', -- Market profile information
    volume_profile_analysis JSONB DEFAULT '{}', -- Volume profile context

    -- Intermarket analysis
    correlation_with_index DECIMAL(5,2) DEFAULT 0, -- Correlation with major index
    correlation_with_commodities DECIMAL(5,2) DEFAULT 0, -- Correlation with commodities
    correlation_with_bonds DECIMAL(5,2) DEFAULT 0, -- Correlation with bond markets
    risk_on_off_sentiment TEXT DEFAULT 'neutral' CHECK (risk_on_off_sentiment IN ('risk_on', 'risk_off', 'neutral')),

    -- Seasonal and cyclical factors
    day_of_week INTEGER DEFAULT 0, -- 0-6 (Sunday-Saturday)
    time_of_day DECIMAL(8,4) DEFAULT 0, -- Hour as decimal (0-23.999)
    month_of_year INTEGER DEFAULT 0, -- 1-12
    seasonal_tendency TEXT DEFAULT 'neutral' CHECK (seasonal_tendency IN ('bullish', 'bearish', 'neutral')),
    cyclical_position TEXT DEFAULT 'unknown' CHECK (cyclical_position IN ('early_cycle', 'mid_cycle', 'late_cycle', 'recession', 'unknown')),

    -- Risk environment
    risk_appetite TEXT DEFAULT 'neutral' CHECK (risk_appetite IN ('high', 'moderate', 'low', 'aversion')),
    vix_level DECIMAL(10,4) DEFAULT 0, -- Volatility index level
    fear_greed_index DECIMAL(5,2) DEFAULT 0, -- Fear & Greed index (0-100)
    safe_haven_demand DECIMAL(5,2) DEFAULT 0, -- Demand for safe havens (0-100)
    systematic_risk_level DECIMAL(5,2) DEFAULT 0, -- Level of systemic risk (0-100)

    -- Geopolitical context
    geopolitical_risk_level TEXT DEFAULT 'low' CHECK (geopolitical_risk_level IN ('low', 'moderate', 'high', 'extreme')),
    major_geopolitical_events TEXT[] DEFAULT '{}', -- IDs of major geopolitical events
    currency_stability TEXT DEFAULT 'stable' CHECK (currency_stability IN ('stable', 'unstable', 'crisis')),
    trade_tensions TEXT DEFAULT 'normal' CHECK (trade_tensions IN ('low', 'normal', 'high', 'extreme')),

    -- Market sentiment indicators
    retail_sentiment DECIMAL(5,2) DEFAULT 0, -- -100 to 100 (bearish to bullish)
    institutional_sentiment DECIMAL(5,2) DEFAULT 0, -- -100 to 100
    analyst_consensus TEXT DEFAULT 'neutral' CHECK (analyst_consensus IN ('strong_buy', 'buy', 'neutral', 'sell', 'strong_sell')),
    social_media_sentiment DECIMAL(5,2) DEFAULT 0, -- -100 to 100
    news_sentiment_score DECIMAL(5,2) DEFAULT 0, -- -100 to 100

    -- Context confidence and reliability
    context_confidence_score DECIMAL(5,2) DEFAULT 0 CHECK (context_confidence_score >= 0 AND context_confidence_score <= 100),
    data_quality_score DECIMAL(5,2) DEFAULT 0 CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
    information_timestamp TIMESTAMP WITH TIME ZONE, -- When this context was generated
    is_real_time_data BOOLEAN DEFAULT false,

    -- Context evolution
    context_change_reason TEXT, -- Why context changed from previous
    context_stability_duration_minutes INTEGER DEFAULT 0, -- How long this context has been stable
    expected_context_duration_minutes INTEGER DEFAULT 0, -- Expected duration of current context
    context_transition_probability DECIMAL(5,2) DEFAULT 0, -- Probability of context changing

    -- Metadata
    context_sources TEXT[] DEFAULT '{}', -- Sources used for context analysis
    analysis_methodology TEXT, -- Methodology used for context analysis
    confidence_factors JSONB DEFAULT '{}', -- Factors affecting confidence
    custom_context_fields JSONB DEFAULT '{}' -- Custom context metadata
);

-- Indexes for market_context
CREATE INDEX IF NOT EXISTS idx_market_context_signal_id ON public.market_context(signal_id);
CREATE INDEX IF NOT EXISTS idx_market_context_symbol ON public.market_context(symbol);
CREATE INDEX IF NOT EXISTS idx_market_context_timestamp ON public.market_context(context_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_context_market_regime ON public.market_context(market_regime);
CREATE INDEX IF NOT EXISTS idx_market_context_volatility_state ON public.market_context(volatility_state);
CREATE INDEX IF NOT EXISTS idx_market_context_session_info ON public.market_context(session_info);
CREATE INDEX IF NOT EXISTS idx_market_context_liquidity_conditions ON public.market_context(liquidity_conditions);
CREATE INDEX IF NOT EXISTS idx_market_context_news_impact ON public.market_context(news_impact_level);
CREATE INDEX IF NOT EXISTS idx_market_context_institutional_activity ON public.market_context(institutional_activity_level);
CREATE INDEX IF NOT EXISTS idx_market_context_risk_appetite ON public.market_context(risk_appetite);
CREATE INDEX IF NOT EXISTS idx_market_context_confidence ON public.market_context(context_confidence_score DESC);

-- Enable Row Level Security
ALTER TABLE public.market_context ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Market context readable by authenticated users"
ON public.market_context
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Market context manageable by users"
ON public.market_context
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.mt5_signals ms
        WHERE ms.id = market_context.signal_id
        AND ms.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.mt5_signals ms
        WHERE ms.id = market_context.signal_id
        AND ms.user_id = auth.uid()
    )
);

-- Trigger for updated_at
CREATE TRIGGER update_market_context_updated_at
    BEFORE UPDATE ON public.market_context
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to automatically determine session info based on timestamp
CREATE OR REPLACE FUNCTION determine_session_info(input_timestamp TIMESTAMP WITH TIME ZONE)
RETURNS TEXT AS $$
DECLARE
    hour_offset INTEGER := EXTRACT(HOUR FROM input_timestamp AT TIME ZONE 'UTC');
    day_of_week INTEGER := EXTRACT(DOW FROM input_timestamp);
BEGIN
    -- Weekend
    IF day_of_week IN (0, 6) THEN
        RETURN 'weekend';
    END IF;

    -- Asia session (approx 22:00 - 08:00 UTC)
    IF hour_offset >= 22 OR hour_offset < 8 THEN
        RETURN 'asia';
    END IF;

    -- London session (approx 08:00 - 17:00 UTC)
    IF hour_offset >= 8 AND hour_offset < 17 THEN
        -- London-New York overlap (approx 13:00 - 17:00 UTC)
        IF hour_offset >= 13 THEN
            RETURN 'london_new_york_overlap';
        ELSE
            RETURN 'london';
        END IF;
    END IF;

    -- New York session (approx 13:00 - 22:00 UTC)
    IF hour_offset >= 17 AND hour_offset < 22 THEN
        RETURN 'new_york';
    END IF;

    RETURN 'unknown';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update session info automatically
CREATE OR REPLACE FUNCTION update_session_info()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.session_info = 'unknown' OR NEW.session_info IS NULL THEN
        NEW.session_info := determine_session_info(NEW.context_timestamp);
    END IF;

    -- Update day of week and time of day
    NEW.day_of_week := EXTRACT(DOW FROM NEW.context_timestamp);
    NEW.time_of_day := EXTRACT(HOUR FROM NEW.context_timestamp) + EXTRACT(MINUTE FROM NEW.context_timestamp) / 60.0;
    NEW.month_of_year := EXTRACT(MONTH FROM NEW.context_timestamp);

    -- Determine if major session
    NEW.is_major_session := NEW.session_info IN ('london', 'new_york', 'london_new_york_overlap');

    -- Set session intensity based on session and time
    IF NEW.session_info = 'london_new_york_overlap' THEN
        NEW.session_intensity := 95;
    ELSIF NEW.session_info = 'london' OR NEW.session_info = 'new_york' THEN
        NEW.session_intensity := 80;
    ELSIF NEW.session_info = 'asia' THEN
        NEW.session_intensity := 60;
    ELSE
        NEW.session_intensity := 30;
    END IF;

    -- Adjust session intensity based on phase
    IF NEW.session_phase = 'opening' OR NEW.session_phase = 'overlap_start' THEN
        NEW.session_intensity := NEW.session_intensity * 1.1;
    ELSIF NEW.session_phase = 'closing' OR NEW.session_phase = 'overlap_end' THEN
        NEW.session_intensity := NEW.session_intensity * 0.9;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_session_info_trigger
    BEFORE INSERT OR UPDATE ON public.market_context
    FOR EACH ROW
    EXECUTE FUNCTION update_session_info();

-- Comment for documentation
COMMENT ON TABLE public.market_context IS 'Comprehensive market context information including regime, volatility, session, liquidity, and sentiment data for trade analysis';