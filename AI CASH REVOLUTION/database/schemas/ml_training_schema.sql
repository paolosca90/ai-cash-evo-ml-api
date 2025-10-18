-- ========================================
-- ML TRAINING SYSTEM DATABASE SCHEMA
-- ========================================
-- This SQL creates the necessary tables for the ML training system
-- that will generate random signals, track their performance, and
-- store training data for LSTM weight optimization

-- 1. ML Training Samples Table
-- Stores all generated random signals with their indicator values and outcomes
CREATE TABLE IF NOT EXISTS ml_training_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT NOT NULL,
    signal_type TEXT NOT NULL CHECK (signal_type IN ('BUY', 'SELL')),
    entry_price NUMERIC(15,5) NOT NULL,
    stop_loss NUMERIC(15,5) NOT NULL,
    take_profit NUMERIC(15,5) NOT NULL,

    -- Indicator values used for signal generation
    adx_value NUMERIC(8,3),
    rsi_value NUMERIC(8,3),
    ema_12 NUMERIC(15,5),
    ema_21 NUMERIC(15,5),
    ema_50 NUMERIC(15,5),
    vwap NUMERIC(15,5),
    atr_value NUMERIC(10,5),
    bollinger_upper NUMERIC(15,5),
    bollinger_lower NUMERIC(15,5),
    stoch_k NUMERIC(8,3),
    stoch_d NUMERIC(8,3),
    macd_line NUMERIC(10,6),
    macd_signal NUMERIC(10,6),
    volume_ma NUMERIC(15,2),
    price_change_pct NUMERIC(8,4),
    volatility NUMERIC(8,4),

    -- Market conditions at signal generation
    market_session TEXT,
    trend_direction TEXT,
    volatility_regime TEXT,

    -- Execution details
    lot_size NUMERIC(8,2) DEFAULT 0.01,
    confidence_score NUMERIC(5,2), -- AI confidence when signal was generated

    -- Performance tracking
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'EXECUTED', 'SL_HIT', 'TP_HIT', 'CANCELLED', 'EXPIRED')),
    entry_time TIMESTAMPTZ DEFAULT NOW(),
    exit_time TIMESTAMPTZ,
    profit_loss NUMERIC(15,5),
    profit_loss_pips NUMERIC(8,4),
    duration_minutes INTEGER,

    -- Weight tracking for ML optimization
    initial_weight NUMERIC(5,4) DEFAULT 1.0,
    optimized_weight NUMERIC(5,4),
    performance_score NUMERIC(5,4), -- Used for LSTM training

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ML Model Performance Table
-- Tracks model performance metrics and weight updates
CREATE TABLE IF NOT EXISTS ml_model_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_version TEXT NOT NULL,
    training_date TIMESTAMPTZ DEFAULT NOW(),

    -- Training metrics
    training_samples_count INTEGER,
    validation_samples_count INTEGER,
    test_samples_count INTEGER,

    -- Performance metrics
    accuracy NUMERIC(5,4),
    precision_buy NUMERIC(5,4),
    precision_sell NUMERIC(5,4),
    recall_buy NUMERIC(5,4),
    recall_sell NUMERIC(5,4),
    f1_score NUMERIC(5,4),

    -- Financial metrics
    overall_win_rate NUMERIC(5,4),
    avg_profit_per_trade NUMERIC(15,5),
    profit_factor NUMERIC(8,4),
    max_drawdown NUMERIC(8,4),
    sharpe_ratio NUMERIC(8,4),

    -- Model weights (JSON object with indicator weights)
    previous_weights JSONB,
    new_weights JSONB,
    weight_changes JSONB,

    -- Feature importance from LSTM
    feature_importance JSONB,

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ML Generation Logs Table
-- Logs all random signal generation batches
CREATE TABLE IF NOT EXISTS ml_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id TEXT NOT NULL,
    generation_time TIMESTAMPTZ DEFAULT NOW(),

    -- Batch details
    symbols_count INTEGER,
    signals_per_symbol INTEGER,
    total_signals_generated INTEGER,

    -- Generation parameters
    generation_strategy TEXT,
    market_conditions JSONB,
    random_seed INTEGER,

    -- Quality metrics
    avg_confidence NUMERIC(5,2),
    signal_distribution JSONB, -- Distribution of BUY/SELL signals

    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'FAILED')),
    error_message TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ML Weights Table
-- Current active weights for signal generation
CREATE TABLE IF NOT EXISTS ml_indicator_weights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    indicator_name TEXT NOT NULL UNIQUE,
    current_weight NUMERIC(5,4) NOT NULL DEFAULT 1.0,
    default_weight NUMERIC(5,4) NOT NULL DEFAULT 1.0,

    -- Weight metadata
    weight_category TEXT, -- 'trend', 'momentum', 'volatility', 'volume'
    importance_rank INTEGER,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    update_count INTEGER DEFAULT 0,

    -- Performance tracking
    avg_performance_with_weight NUMERIC(5,4),
    weight_stability NUMERIC(5,4),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. OANDA Paper Trades Table
-- Tracks all paper trades executed via OANDA API
CREATE TABLE IF NOT EXISTS oanda_paper_trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ml_sample_id UUID REFERENCES ml_training_samples(id),

    -- OANDA trade details
    oanda_order_id TEXT,
    oanda_trade_id TEXT,
    symbol TEXT NOT NULL,
    units INTEGER NOT NULL, -- Positive for BUY, negative for SELL
    price NUMERIC(15,5) NOT NULL,

    -- Trade management
    stop_loss_order_id TEXT,
    take_profit_order_id TEXT,
    stop_loss_price NUMERIC(15,5),
    take_profit_price NUMERIC(15,5),

    -- Execution details
    fill_time TIMESTAMPTZ DEFAULT NOW(),
    close_time TIMESTAMPTZ,
    close_price NUMERIC(15,5),
    profit NUMERIC(15,2),
    financing NUMERIC(15,2) DEFAULT 0,
    commission NUMERIC(15,2) DEFAULT 0,

    -- Status tracking
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'CANCELLED')),
    close_reason TEXT, -- 'STOP_LOSS', 'TAKE_PROFIT', 'MANUAL', 'MARGIN_CALL'

    -- API response data
    oanda_response JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ========================================

-- ML Training Samples indexes
CREATE INDEX IF NOT EXISTS idx_ml_training_samples_symbol_created ON ml_training_samples(symbol, created_at);
CREATE INDEX IF NOT EXISTS idx_ml_training_samples_status_entry ON ml_training_samples(status, entry_time);
CREATE INDEX IF NOT EXISTS idx_ml_training_samples_performance_score ON ml_training_samples(performance_score DESC);
CREATE INDEX IF NOT EXISTS idx_ml_training_samples_exit_time ON ml_training_samples(exit_time) WHERE exit_time IS NOT NULL;

-- ML Model Performance indexes
CREATE INDEX IF NOT EXISTS idx_ml_model_performance_training_date ON ml_model_performance(training_date DESC);
CREATE INDEX IF NOT EXISTS idx_ml_model_performance_active ON ml_model_performance(is_active) WHERE is_active = TRUE;

-- ML Generation Logs indexes
CREATE INDEX IF NOT EXISTS idx_ml_generation_logs_batch_id ON ml_generation_logs(batch_id);
CREATE INDEX IF NOT EXISTS idx_ml_generation_logs_generation_time ON ml_generation_logs(generation_time DESC);

-- ML Indicator Weights indexes
CREATE INDEX IF NOT EXISTS idx_ml_indicator_weights_category ON ml_indicator_weights(weight_category);
CREATE INDEX IF NOT EXISTS idx_ml_indicator_weights_updated ON ml_indicator_weights(last_updated DESC);

-- OANDA Paper Trades indexes
CREATE INDEX IF NOT EXISTS idx_oanda_paper_trades_ml_sample_id ON oanda_paper_trades(ml_sample_id);
CREATE INDEX IF NOT EXISTS idx_oanda_paper_trades_symbol_status ON oanda_paper_trades(symbol, status);
CREATE INDEX IF NOT EXISTS idx_oanda_paper_trades_fill_time ON oanda_paper_trades(fill_time DESC);

-- ========================================
-- INITIAL WEIGHT DATA SETUP
-- ========================================

-- Initialize default indicator weights
INSERT INTO ml_indicator_weights (indicator_name, current_weight, default_weight, weight_category, importance_rank) VALUES
('adx_value', 1.0, 1.0, 'trend', 1),
('rsi_value', 1.0, 1.0, 'momentum', 2),
('ema_12', 1.0, 1.0, 'trend', 3),
('ema_21', 1.0, 1.0, 'trend', 4),
('ema_50', 1.0, 1.0, 'trend', 5),
('vwap', 1.0, 1.0, 'trend', 6),
('atr_value', 1.0, 1.0, 'volatility', 7),
('bollinger_upper', 1.0, 1.0, 'volatility', 8),
('bollinger_lower', 1.0, 1.0, 'volatility', 9),
('stoch_k', 1.0, 1.0, 'momentum', 10),
('stoch_d', 1.0, 1.0, 'momentum', 11),
('macd_line', 1.0, 1.0, 'momentum', 12),
('macd_signal', 1.0, 1.0, 'momentum', 13),
('volume_ma', 1.0, 1.0, 'volume', 14),
('price_change_pct', 1.0, 1.0, 'momentum', 15),
('volatility', 1.0, 1.0, 'volatility', 16)
ON CONFLICT (indicator_name) DO NOTHING;

-- ========================================
-- RLS (ROW LEVEL SECURITY) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE ml_training_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_generation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ml_indicator_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE oanda_paper_trades ENABLE ROW LEVEL SECURITY;

-- ML Training Samples - Only system access
CREATE POLICY "System only access to ml_training_samples" ON ml_training_samples
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ML Model Performance - Read access for all users, write for system
CREATE POLICY "Read access to ml_model_performance" ON ml_model_performance
    FOR SELECT USING (true);
CREATE POLICY "System write access to ml_model_performance" ON ml_model_performance
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "System update access to ml_model_performance" ON ml_model_performance
    FOR UPDATE USING (auth.jwt() ->> 'role' = 'service_role');

-- ML Generation Logs - Read access for authenticated users
CREATE POLICY "Read access to ml_generation_logs" ON ml_generation_logs
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "System write access to ml_generation_logs" ON ml_generation_logs
    FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ML Indicator Weights - Read access for authenticated users
CREATE POLICY "Read access to ml_indicator_weights" ON ml_indicator_weights
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "System write access to ml_indicator_weights" ON ml_indicator_weights
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- OANDA Paper Trades - Read access for authenticated users
CREATE POLICY "Read access to oanda_paper_trades" ON oanda_paper_trades
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "System write access to oanda_paper_trades" ON oanda_paper_trades
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ========================================
-- FUNCTIONS AND TRIGGERS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_ml_training_samples_updated_at BEFORE UPDATE ON ml_training_samples
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ml_indicator_weights_updated_at BEFORE UPDATE ON ml_indicator_weights
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oanda_paper_trades_updated_at BEFORE UPDATE ON oanda_paper_trades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate performance score for completed trades
CREATE OR REPLACE FUNCTION calculate_ml_performance_score()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate for completed trades
    IF NEW.status IN ('SL_HIT', 'TP_HIT') AND OLD.status = 'PENDING' THEN
        -- Calculate performance score based on P&L and duration
        IF NEW.profit_loss IS NOT NULL THEN
            -- Normalize profit/loss to a score between -1 and 1
            -- Assuming 0.01 lot size, typical SL/TP of 20 pips = $2 risk/reward
            NEW.performance_score = GREATEST(-1, LEAST(1, NEW.profit_loss / 2.0));

            -- Bonus points for quick execution (duration penalty)
            IF NEW.duration_minutes IS NOT NULL AND NEW.duration_minutes < 60 THEN
                NEW.performance_score = NEW.performance_score * 1.1;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-calculate performance scores
CREATE TRIGGER calculate_ml_performance_score_trigger BEFORE UPDATE ON ml_training_samples
    FOR EACH ROW EXECUTE FUNCTION calculate_ml_performance_score();

-- ========================================
-- VIEWS FOR DATA ANALYSIS
-- ========================================

-- View for current active weights
CREATE OR REPLACE VIEW ml_active_weights AS
SELECT
    indicator_name,
    current_weight,
    default_weight,
    weight_category,
    importance_rank,
    last_updated,
    update_count,
    avg_performance_with_weight,
    weight_stability
FROM ml_indicator_weights
ORDER BY importance_rank;

-- View for recent training performance
CREATE OR REPLACE VIEW ml_recent_performance AS
SELECT
    mps.symbol,
    mps.signal_type,
    mps.entry_time,
    mps.exit_time,
    mps.profit_loss,
    mps.performance_score,
    mps.status,
    mps.confidence_score,
    CASE
        WHEN mps.profit_loss > 0 THEN 'WIN'
        WHEN mps.profit_loss < 0 THEN 'LOSS'
        ELSE 'BREAKEVEN'
    END as result
FROM ml_training_samples mps
WHERE mps.exit_time IS NOT NULL
ORDER BY mps.entry_time DESC;

-- View for model performance over time
CREATE OR REPLACE VIEW ml_model_performance_trend AS
SELECT
    mmp.model_version,
    mmp.training_date,
    mmp.accuracy,
    mmp.overall_win_rate,
    mmp.avg_profit_per_trade,
    mmp.profit_factor,
    mmp.max_drawdown,
    mmp.sharpe_ratio
FROM ml_model_performance mmp
WHERE mmp.is_active = TRUE
ORDER BY mmp.training_date DESC;

-- ========================================
-- SAMPLE DATA (for testing)
-- ========================================

-- Insert a sample generation log
INSERT INTO ml_generation_logs (
    batch_id,
    symbols_count,
    signals_per_symbol,
    total_signals_generated,
    generation_strategy,
    avg_confidence,
    signal_distribution
) VALUES (
    'batch_' || EXTRACT(EPOCH FROM NOW())::text,
    5,
    10,
    50,
    'random_weighted',
    65.5,
    '{"BUY": 25, "SELL": 25}'
);

-- ========================================
-- COMPLETION MESSAGE
-- ========================================

DO $$
BEGIN
    RAISE NOTICE 'ML Training System Database Schema Created Successfully!';
    RAISE NOTICE 'Tables created: ml_training_samples, ml_model_performance, ml_generation_logs, ml_indicator_weights, oanda_paper_trades';
    RAISE NOTICE 'Indexes created for optimal performance';
    RAISe NOTICE 'RLS policies enabled for security';
    RAISE NOTICE 'Default indicator weights initialized';
    RAISE NOTICE 'Triggers and functions for automated calculations';
    RAISE NOTICE 'Views created for data analysis';
END $$;