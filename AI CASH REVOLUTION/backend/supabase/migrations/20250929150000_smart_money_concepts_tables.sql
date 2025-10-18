-- Smart Money Concepts Analysis Tables
-- This migration adds tables for storing and analyzing institutional trading patterns

-- Table for storing detected Order Blocks
CREATE TABLE IF NOT EXISTS smart_money_order_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('BULLISH', 'BEARISH')),
    price DECIMAL(20, 10) NOT NULL,
    high DECIMAL(20, 10) NOT NULL,
    low DECIMAL(20, 10) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    timeframe VARCHAR(5) NOT NULL CHECK (timeframe IN ('M1', 'M5', 'M15', 'H1', 'H4', 'D1')),
    strength DECIMAL(3, 1) NOT NULL CHECK (strength >= 1 AND strength <= 10),
    volume_spike DECIMAL(10, 2) NOT NULL,
    rejection_strength DECIMAL(5, 3) NOT NULL,
    is_swept BOOLEAN DEFAULT false,
    remaining_strength DECIMAL(3, 1) NOT NULL,
    sweep_timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    -- Indexes for performance
    INDEX idx_order_blocks_symbol_timestamp (symbol, timestamp DESC),
    INDEX idx_order_blocks_user_id (user_id),
    INDEX idx_order_blocks_type (type),
    INDEX idx_order_blocks_is_swept (is_swept)
);

-- Table for storing Fair Value Gaps (FVG)
CREATE TABLE IF NOT EXISTS smart_money_fair_value_gaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('BULLISH', 'BEARISH')),
    start_price DECIMAL(20, 10) NOT NULL,
    end_price DECIMAL(20, 10) NOT NULL,
    gap_size DECIMAL(15, 2) NOT NULL, -- Size in pips/points
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    timeframe VARCHAR(5) NOT NULL CHECK (timeframe IN ('M1', 'M5', 'M15', 'H1', 'H4', 'D1')),
    is_filled BOOLEAN DEFAULT false,
    fill_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (fill_percentage >= 0 AND fill_percentage <= 100),
    volume_confirmation DECIMAL(10, 2) NOT NULL,
    filled_timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    -- Indexes for performance
    INDEX idx_fvg_symbol_timestamp (symbol, timestamp DESC),
    INDEX idx_fvg_user_id (user_id),
    INDEX idx_fvg_type (type),
    INDEX idx_fvg_is_filled (is_filled)
);

-- Table for storing Liquidity Pools
CREATE TABLE IF NOT EXISTS smart_money_liquidity_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    type VARCHAR(25) NOT NULL CHECK (type IN ('SWING_HIGH', 'SWING_LOW', 'ROUND_NUMBER', 'PSYCHOLOGICAL_LEVEL')),
    price DECIMAL(20, 10) NOT NULL,
    strength DECIMAL(3, 1) NOT NULL CHECK (strength >= 1 AND strength <= 10),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    timeframe VARCHAR(5) NOT NULL CHECK (timeframe IN ('M1', 'M5', 'M15', 'H1', 'H4', 'D1')),
    is_swept BOOLEAN DEFAULT false,
    sweep_timestamp TIMESTAMP WITH TIME ZONE,
    volume_cluster BIGINT NOT NULL,
    stop_loss_density DECIMAL(5, 1) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    -- Indexes for performance
    INDEX idx_liquidity_pools_symbol_timestamp (symbol, timestamp DESC),
    INDEX idx_liquidity_pools_user_id (user_id),
    INDEX idx_liquidity_pools_type (type),
    INDEX idx_liquidity_pools_is_swept (is_swept)
);

-- Table for storing Volume Profile analysis
CREATE TABLE IF NOT EXISTS smart_money_volume_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(5) NOT NULL CHECK (timeframe IN ('M1', 'M5', 'M15', 'H1', 'H4', 'D1')),
    poc DECIMAL(20, 10) NOT NULL, -- Point of Control
    value_area_high DECIMAL(20, 10) NOT NULL,
    value_area_low DECIMAL(20, 10) NOT NULL,
    total_volume BIGINT NOT NULL,
    high_volume_nodes DECIMAL(20, 10)[] DEFAULT '{}',
    low_volume_nodes DECIMAL(20, 10)[] DEFAULT '{}',
    price_levels JSONB NOT NULL, -- Array of price level data
    analysis_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    -- Indexes for performance
    INDEX idx_volume_profiles_symbol_timeframe (symbol, timeframe),
    INDEX idx_volume_profiles_user_id (user_id),
    INDEX idx_volume_profiles_timestamp (analysis_timestamp DESC)
);

-- Table for storing Confluence Zones
CREATE TABLE IF NOT EXISTS smart_money_confluence_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    price DECIMAL(20, 10) NOT NULL,
    strength DECIMAL(5, 1) NOT NULL CHECK (strength >= 0),
    concepts TEXT[] NOT NULL, -- Array of concept names
    timeframe VARCHAR(5) NOT NULL CHECK (timeframe IN ('M1', 'M5', 'M15', 'H1', 'H4', 'D1')),
    detection_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    expiry_timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    -- Indexes for performance
    INDEX idx_confluence_zones_symbol_price (symbol, price),
    INDEX idx_confluence_zones_user_id (user_id),
    INDEX idx_confluence_zones_strength (strength DESC),
    INDEX idx_confluence_zones_is_active (is_active)
);

-- Table for storing Institutional Activity detection
CREATE TABLE IF NOT EXISTS smart_money_institutional_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    analysis_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    confidence_score DECIMAL(5, 1) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),

    -- Footprint analysis
    large_orders_count INTEGER NOT NULL DEFAULT 0,
    volume_anomaly BOOLEAN DEFAULT false,
    aggressive_buying BOOLEAN DEFAULT false,
    aggressive_selling BOOLEAN DEFAULT false,
    absorption_pattern BOOLEAN DEFAULT false,
    stop_run_pattern BOOLEAN DEFAULT false,

    -- Timeframe activity
    m1_activity BOOLEAN DEFAULT false,
    m5_activity BOOLEAN DEFAULT false,
    m15_activity BOOLEAN DEFAULT false,
    h1_activity BOOLEAN DEFAULT false,
    h4_activity BOOLEAN DEFAULT false,
    d1_activity BOOLEAN DEFAULT false,

    -- Market context
    current_price DECIMAL(20, 10) NOT NULL,
    atr_value DECIMAL(20, 10) NOT NULL,
    volume_profile_poc DECIMAL(20, 10),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    -- Indexes for performance
    INDEX idx_institutional_activity_symbol_timestamp (symbol, analysis_timestamp DESC),
    INDEX idx_institutional_activity_user_id (user_id),
    INDEX idx_institutional_activity_confidence (confidence_score DESC)
);

-- Table for storing Smart Money Concepts Trading Signals
CREATE TABLE IF NOT EXISTS smart_money_trading_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    signal_id VARCHAR(100) NOT NULL UNIQUE,
    symbol VARCHAR(20) NOT NULL,
    signal_type VARCHAR(10) NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'HOLD')),
    confidence DECIMAL(5, 1) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    entry_price DECIMAL(20, 10) NOT NULL,
    stop_loss DECIMAL(20, 10),
    take_profit DECIMAL(20, 10),
    risk_reward_ratio DECIMAL(5, 2),

    -- Smart Money Concepts context
    zone_price DECIMAL(20, 10) NOT NULL,
    zone_strength DECIMAL(5, 1) NOT NULL,
    contributing_concepts TEXT[] NOT NULL,
    market_trend VARCHAR(10) NOT NULL CHECK (market_trend IN ('BULLISH', 'BEARISH', 'RANGING')),
    institutional_confidence DECIMAL(5, 1) NOT NULL,

    -- Signal lifecycle
    signal_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_timestamp TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    is_executed BOOLEAN DEFAULT false,
    execution_timestamp TIMESTAMP WITH TIME ZONE,

    -- Performance tracking
    actual_outcome VARCHAR(20), -- 'WIN', 'LOSS', 'BREAKEVEN', 'PENDING'
    actual_profit_loss DECIMAL(20, 10),
    actual_profit_loss_pips DECIMAL(15, 2),
    max_favorable_excursion DECIMAL(20, 10),
    max_adverse_excursion DECIMAL(20, 10),
    trade_duration_minutes INTEGER,

    reasoning TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    -- Indexes for performance
    INDEX idx_smart_signals_user_timestamp (user_id, signal_timestamp DESC),
    INDEX idx_smart_signals_symbol (symbol),
    INDEX idx_smart_signals_type (signal_type),
    INDEX idx_smart_signals_confidence (confidence DESC),
    INDEX idx_smart_signals_is_active (is_active),
    INDEX idx_smart_signals_is_executed (is_executed)
);

-- Table for Smart Money Concepts Analysis Sessions
CREATE TABLE IF NOT EXISTS smart_money_analysis_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) NOT NULL,
    session_id VARCHAR(100) NOT NULL UNIQUE,

    -- Analysis results summary
    total_order_blocks INTEGER NOT NULL DEFAULT 0,
    total_fair_value_gaps INTEGER NOT NULL DEFAULT 0,
    total_liquidity_pools INTEGER NOT NULL DEFAULT 0,
    active_confluence_zones INTEGER NOT NULL DEFAULT 0,
    market_trend VARCHAR(10) NOT NULL CHECK (market_trend IN ('BULLISH', 'BEARISH', 'RANGING')),
    market_state VARCHAR(20) NOT NULL,
    institutional_confidence DECIMAL(5, 1) NOT NULL,

    -- Performance metrics
    signals_generated INTEGER NOT NULL DEFAULT 0,
    analysis_duration_ms INTEGER NOT NULL,

    -- Session metadata
    analysis_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    timeframe_configuration JSONB DEFAULT '{}',
    analysis_parameters JSONB DEFAULT '{}',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    -- Indexes for performance
    INDEX idx_sessions_user_timestamp (user_id, analysis_timestamp DESC),
    INDEX idx_sessions_symbol (symbol),
    INDEX idx_sessions_market_trend (market_trend)
);

-- Create function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers for tables with updated_at column
CREATE TRIGGER update_order_blocks_updated_at BEFORE UPDATE ON smart_money_order_blocks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fvg_updated_at BEFORE UPDATE ON smart_money_fair_value_gaps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_liquidity_pools_updated_at BEFORE UPDATE ON smart_money_liquidity_pools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_smart_signals_updated_at BEFORE UPDATE ON smart_money_trading_signals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for Smart Money Concepts dashboard
CREATE OR REPLACE VIEW smart_money_dashboard_view AS
SELECT
    u.id as user_id,
    u.email,

    -- Recent analysis counts
    COALESCE(ob_count.total_order_blocks, 0) as total_order_blocks,
    COALESCE(fvg_count.total_fair_value_gaps, 0) as total_fair_value_gaps,
    COALESCE(lp_count.total_liquidity_pools, 0) as total_liquidity_pools,
    COALESCE(cz_count.active_confluence_zones, 0) as active_confluence_zones,

    -- Recent signals
    COALESCE(sig_count.total_signals, 0) as total_signals,
    COALESCE(sig_win_count.winning_signals, 0) as winning_signals,

    -- Performance metrics
    CASE
        WHEN COALESCE(sig_count.total_signals, 0) > 0
        THEN ROUND((COALESCE(sig_win_count.winning_signals, 0)::FLOAT / COALESCE(sig_count.total_signals, 1)) * 100, 2)
        ELSE 0
    END as win_rate_percentage,

    -- Recent institutional activity
    COALESCE(ia_conf.avg_confidence, 0) as avg_institutional_confidence,

    -- Most recent analysis
    MAX(sa.analysis_timestamp) as last_analysis_timestamp

FROM auth.users u
LEFT JOIN (
    SELECT user_id, COUNT(*) as total_order_blocks
    FROM smart_money_order_blocks
    WHERE created_at >= now() - interval '30 days'
    GROUP BY user_id
) ob_count ON u.id = ob_count.user_id

LEFT JOIN (
    SELECT user_id, COUNT(*) as total_fair_value_gaps
    FROM smart_money_fair_value_gaps
    WHERE created_at >= now() - interval '30 days'
    GROUP BY user_id
) fvg_count ON u.id = fvg_count.user_id

LEFT JOIN (
    SELECT user_id, COUNT(*) as total_liquidity_pools
    FROM smart_money_liquidity_pools
    WHERE created_at >= now() - interval '30 days'
    GROUP BY user_id
) lp_count ON u.id = lp_count.user_id

LEFT JOIN (
    SELECT user_id, COUNT(*) as active_confluence_zones
    FROM smart_money_confluence_zones
    WHERE is_active = true AND created_at >= now() - interval '30 days'
    GROUP BY user_id
) cz_count ON u.id = cz_count.user_id

LEFT JOIN (
    SELECT user_id, COUNT(*) as total_signals
    FROM smart_money_trading_signals
    WHERE created_at >= now() - interval '30 days'
    GROUP BY user_id
) sig_count ON u.id = sig_count.user_id

LEFT JOIN (
    SELECT user_id, COUNT(*) as winning_signals
    FROM smart_money_trading_signals
    WHERE actual_outcome = 'WIN' AND created_at >= now() - interval '30 days'
    GROUP BY user_id
) sig_win_count ON u.id = sig_win_count.user_id

LEFT JOIN (
    SELECT user_id, AVG(confidence_score) as avg_confidence
    FROM smart_money_institutional_activity
    WHERE analysis_timestamp >= now() - interval '30 days'
    GROUP BY user_id
) ia_conf ON u.id = ia_conf.user_id

LEFT JOIN smart_money_analysis_sessions sa ON u.id = sa.user_id

WHERE u.id IN (
    SELECT id FROM auth.users
    WHERE created_at >= now() - interval '365 days'
    OR id IN (SELECT user_id FROM smart_money_order_blocks)
    OR id IN (SELECT user_id FROM smart_money_trading_signals)
)

GROUP BY u.id, u.email,
         ob_count.total_order_blocks, fvg_count.total_fair_value_gaps,
         lp_count.total_liquidity_pools, cz_count.active_confluence_zones,
         sig_count.total_signals, sig_win_count.winning_signals,
         ia_conf.avg_confidence;

-- Add comments for documentation
COMMENT ON TABLE smart_money_order_blocks IS 'Stores detected institutional order blocks for Smart Money Concepts analysis';
COMMENT ON TABLE smart_money_fair_value_gaps IS 'Stores Fair Value Gap (FVG) detections showing market inefficiencies';
COMMENT ON TABLE smart_money_liquidity_pools IS 'Stores liquidity pool locations where retail stop losses cluster';
COMMENT ON TABLE smart_money_volume_profiles IS 'Stores volume profile analysis for institutional footprint identification';
COMMENT ON TABLE smart_money_confluence_zones IS 'Stores areas where multiple Smart Money Concepts overlap for high-probability trading';
COMMENT ON TABLE smart_money_institutional_activity IS 'Stores institutional trading pattern detection results';
COMMENT ON TABLE smart_money_trading_signals IS 'Stores trading signals generated from Smart Money Concepts analysis';
COMMENT ON TABLE smart_money_analysis_sessions IS 'Stores analysis session metadata and performance tracking';
COMMENT ON VIEW smart_money_dashboard_view IS 'Dashboard view showing Smart Money Concepts usage statistics and performance';