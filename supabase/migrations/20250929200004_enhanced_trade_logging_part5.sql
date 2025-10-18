-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS public.performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

    -- Basic performance info
    signal_id UUID NOT NULL REFERENCES public.mt5_signals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    strategy_id TEXT, -- Strategy identifier for grouping trades
    calculation_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    calculation_period_days INTEGER DEFAULT 30, -- Period over which metrics are calculated

    -- Basic trade statistics
    total_trades INTEGER DEFAULT 0,
    winning_trades INTEGER DEFAULT 0,
    losing_trades INTEGER DEFAULT 0,
    breakeven_trades INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0, -- Percentage of winning trades
    loss_rate DECIMAL(5,2) DEFAULT 0, -- Percentage of losing trades
    breakeven_rate DECIMAL(5,2) DEFAULT 0, -- Percentage of breakeven trades

    -- Profit and loss metrics
    total_profit DECIMAL(20,10) DEFAULT 0,
    total_loss DECIMAL(20,10) DEFAULT 0,
    net_profit DECIMAL(20,10) DEFAULT 0,
    gross_profit DECIMAL(20,10) DEFAULT 0,
    gross_loss DECIMAL(20,10) DEFAULT 0,
    average_win DECIMAL(20,10) DEFAULT 0,
    average_loss DECIMAL(20,10) DEFAULT 0,
    average_trade DECIMAL(20,10) DEFAULT 0,
    largest_win DECIMAL(20,10) DEFAULT 0,
    largest_loss DECIMAL(20,10) DEFAULT 0,
    profit_factor DECIMAL(15,8) DEFAULT 0, -- Ratio of gross profit to gross loss

    -- Risk-adjusted returns
    sharpe_ratio DECIMAL(15,8) DEFAULT 0, -- Risk-adjusted return (annualized)
    sortino_ratio DECIMAL(15,8) DEFAULT 0, -- Similar to Sharpe but only considers downside risk
    calmar_ratio DECIMAL(15,8) DEFAULT 0, -- Annualized return divided by maximum drawdown
    information_ratio DECIMAL(15,8) DEFAULT 0, -- Excess return per unit of risk
    treynor_ratio DECIMAL(15,8) DEFAULT 0, -- Return per unit of systematic risk
    jensens_alpha DECIMAL(15,8) DEFAULT 0, -- Excess return over expected return
    beta DECIMAL(15,8) DEFAULT 0, -- Systematic risk measure
    alpha DECIMAL(15,8) DEFAULT 0, -- Excess return over benchmark

    -- Drawdown analysis
    current_drawdown DECIMAL(15,8) DEFAULT 0,
    max_drawdown DECIMAL(15,8) DEFAULT 0,
    max_drawdown_duration_days INTEGER DEFAULT 0,
    avg_drawdown DECIMAL(15,8) DEFAULT 0,
    avg_drawdown_duration_days INTEGER DEFAULT 0,
    recovery_factor DECIMAL(15,8) DEFAULT 0, -- Net profit divided by max drawdown
    drawdown_recovery_time_days INTEGER DEFAULT 0,
    time_to_recovery_days INTEGER DEFAULT 0,

    -- Trade duration analysis
    average_trade_duration_minutes DECIMAL(15,2) DEFAULT 0,
    median_trade_duration_minutes DECIMAL(15,2) DEFAULT 0,
    min_trade_duration_minutes DECIMAL(15,2) DEFAULT 0,
    max_trade_duration_minutes DECIMAL(15,2) DEFAULT 0,
    std_trade_duration_minutes DECIMAL(15,2) DEFAULT 0,
    optimal_trade_duration_minutes DECIMAL(15,2) DEFAULT 0,

    -- Risk metrics
    value_at_risk_95 DECIMAL(15,8) DEFAULT 0, -- VaR at 95% confidence
    value_at_risk_99 DECIMAL(15,8) DEFAULT 0, -- VaR at 99% confidence
    expected_shortfall_95 DECIMAL(15,8) DEFAULT 0, -- Expected shortfall at 95% confidence
    expected_shortfall_99 DECIMAL(15,8) DEFAULT 0, -- Expected shortfall at 99% confidence
    downside_deviation DECIMAL(15,8) DEFAULT 0,
    upside_deviation DECIMAL(15,8) DEFAULT 0,
    semivariance DECIMAL(15,8) DEFAULT 0,
    semideviation DECIMAL(15,8) DEFAULT 0,

    -- Streak analysis
    current_win_streak INTEGER DEFAULT 0,
    current_loss_streak INTEGER DEFAULT 0,
    max_win_streak INTEGER DEFAULT 0,
    max_loss_streak INTEGER DEFAULT 0,
    avg_win_streak DECIMAL(5,2) DEFAULT 0,
    avg_loss_streak DECIMAL(5,2) DEFAULT 0,
    streak_vulnerability DECIMAL(5,2) DEFAULT 0, -- Probability of streak ending

    -- Performance consistency
    consistency_score DECIMAL(5,2) DEFAULT 0 CHECK (consistency_score >= 0 AND consistency_score <= 100),
    stability_score DECIMAL(5,2) DEFAULT 0 CHECK (stability_score >= 0 AND stability_score <= 100),
    predictability_score DECIMAL(5,2) DEFAULT 0 CHECK (predictability_score >= 0 AND predictability_score <= 100),
    robustness_score DECIMAL(5,2) DEFAULT 0 CHECK (robustness_score >= 0 AND robustness_score <= 100),
    performance_trend TEXT DEFAULT 'stable' CHECK (performance_trend IN ('improving', 'stable', 'declining', 'volatile')),

    -- Risk-adjusted performance grades
    overall_grade TEXT DEFAULT 'C' CHECK (overall_grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F')),
    profitability_grade TEXT DEFAULT 'C' CHECK (profitability_grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F')),
    risk_grade TEXT DEFAULT 'C' CHECK (risk_grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F')),
    consistency_grade TEXT DEFAULT 'C' CHECK (consistency_grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F')),

    -- Market regime performance
    regime_performance JSONB DEFAULT '{}', -- Performance by market regime
    volatility_performance JSONB DEFAULT '{}', -- Performance by volatility state
    session_performance JSONB DEFAULT '{}', -- Performance by trading session
    trend_performance JSONB DEFAULT '{}', -- Performance by market trend

    -- Time-based performance
    monthly_performance JSONB DEFAULT '{}', -- Monthly performance data
    weekly_performance JSONB DEFAULT '{}', -- Weekly performance data
    daily_performance JSONB DEFAULT '{}', -- Daily performance data
    hourly_performance JSONB DEFAULT '{}', -- Hourly performance data

    -- Comparative performance
    benchmark_performance DECIMAL(15,8) DEFAULT 0, -- Performance against benchmark
    relative_performance DECIMAL(15,8) DEFAULT 0, -- Performance relative to benchmark
    percentile_rank DECIMAL(5,2) DEFAULT 0, -- Performance percentile rank
    performance_z_score DECIMAL(5,2) DEFAULT 0, -- Performance z-score

    -- Predictive metrics
    expected_return DECIMAL(15,8) DEFAULT 0,
    expected_risk DECIMAL(15,8) DEFAULT 0,
    confidence_interval_lower DECIMAL(15,8) DEFAULT 0,
    confidence_interval_upper DECIMAL(15,8) DEFAULT 0,
    prediction_accuracy DECIMAL(5,2) DEFAULT 0,
    model_r_squared DECIMAL(5,2) DEFAULT 0,

    -- Strategy-specific metrics
    strategy_effectiveness DECIMAL(5,2) DEFAULT 0 CHECK (strategy_effectiveness >= 0 AND strategy_effectiveness <= 100),
    strategy_efficiency DECIMAL(5,2) DEFAULT 0 CHECK (strategy_efficiency >= 0 AND strategy_efficiency <= 100),
    strategy_adaptability DECIMAL(5,2) DEFAULT 0 CHECK (strategy_adaptability >= 0 AND strategy_adaptability <= 100),
    strategy_robustness DECIMAL(5,2) DEFAULT 0 CHECK (strategy_robustness >= 0 AND strategy_robustness <= 100),

    -- User performance psychology
    emotional_score DECIMAL(5,2) DEFAULT 0 CHECK (emotional_score >= 0 AND emotional_score <= 100),
    discipline_score DECIMAL(5,2) DEFAULT 0 CHECK (discipline_score >= 0 AND discipline_score <= 100),
    patience_score DECIMAL(5,2) DEFAULT 0 CHECK (patience_score >= 0 AND patience_score <= 100),
    risk_management_score DECIMAL(5,2) DEFAULT 0 CHECK (risk_management_score >= 0 AND risk_management_score <= 100),

    -- AI/ML model performance
    model_accuracy DECIMAL(5,2) DEFAULT 0 CHECK (model_accuracy >= 0 AND model_accuracy <= 100),
    model_precision DECIMAL(5,2) DEFAULT 0 CHECK (model_precision >= 0 AND model_precision <= 100),
    model_recall DECIMAL(5,2) DEFAULT 0 CHECK (model_recall >= 0 AND model_recall <= 100),
    model_f1_score DECIMAL(5,2) DEFAULT 0 CHECK (model_f1_score >= 0 AND model_f1_score <= 100),
    model_calibration DECIMAL(5,2) DEFAULT 0 CHECK (model_calibration >= 0 AND model_calibration <= 100),

    -- Performance attribution
    alpha_attribution DECIMAL(15,8) DEFAULT 0, -- Alpha attributed to strategy
    beta_attribution DECIMAL(15,8) DEFAULT 0, -- Return attributed to market
    selection_alpha DECIMAL(15,8) DEFAULT 0, -- Alpha from security selection
    timing_alpha DECIMAL(15,8) DEFAULT 0, -- Alpha from market timing
    attribution_factors JSONB DEFAULT '{}', -- Detailed attribution breakdown

    -- Risk management effectiveness
    stop_loss_effectiveness DECIMAL(5,2) DEFAULT 0 CHECK (stop_loss_effectiveness >= 0 AND stop_loss_effectiveness <= 100),
    take_profit_effectiveness DECIMAL(5,2) DEFAULT 0 CHECK (take_profit_effectiveness >= 0 AND take_profit_effectiveness <= 100),
    position_sizing_effectiveness DECIMAL(5,2) DEFAULT 0 CHECK (position_sizing_effectiveness >= 0 AND position_sizing_effectiveness <= 100),
    risk_reward_effectiveness DECIMAL(5,2) DEFAULT 0 CHECK (risk_reward_effectiveness >= 0 AND risk_reward_effectiveness <= 100),

    -- Performance benchmarks
    personal_benchmark DECIMAL(15,8) DEFAULT 0, -- Performance against personal history
    peer_benchmark DECIMAL(15,8) DEFAULT 0, -- Performance against peers
    strategy_benchmark DECIMAL(15,8) DEFAULT 0, -- Performance against strategy average
    market_benchmark DECIMAL(15,8) DEFAULT 0, -- Performance against market index

    -- Metadata
    calculation_method TEXT DEFAULT 'standard', -- Method used for calculation
    data_quality_score DECIMAL(5,2) DEFAULT 0 CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
    confidence_level DECIMAL(5,2) DEFAULT 0 CHECK (confidence_level >= 0 AND confidence_level <= 100),
    last_recalculation TIMESTAMP WITH TIME ZONE DEFAULT now(),
    calculation_parameters JSONB DEFAULT '{}', -- Parameters used in calculation
    custom_metrics JSONB DEFAULT '{}' -- Custom performance metrics
);

-- Indexes for performance_metrics
CREATE INDEX IF NOT EXISTS idx_performance_metrics_signal_id ON public.performance_metrics(signal_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON public.performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_symbol ON public.performance_metrics(symbol);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_strategy_id ON public.performance_metrics(strategy_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON public.performance_metrics(calculation_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_win_rate ON public.performance_metrics(win_rate DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_sharpe_ratio ON public.performance_metrics(sharpe_ratio DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_profit_factor ON public.performance_metrics(profit_factor DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_max_drawdown ON public.performance_metrics(max_drawdown);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_overall_grade ON public.performance_metrics(overall_grade);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_calculation_period ON public.performance_metrics(calculation_period_days);

-- Enable Row Level Security
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Performance metrics readable by authenticated users"
ON public.performance_metrics
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Performance metrics manageable by users"
ON public.performance_metrics
FOR ALL
USING (
    auth.uid() = user_id OR
    EXISTS (
        SELECT 1 FROM public.mt5_signals ms
        WHERE ms.id = performance_metrics.signal_id
        AND ms.user_id = auth.uid()
    )
)
WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
        SELECT 1 FROM public.mt5_signals ms
        WHERE ms.id = performance_metrics.signal_id
        AND ms.user_id = auth.uid()
    )
);

-- Trigger for updated_at
CREATE TRIGGER update_performance_metrics_updated_at
    BEFORE UPDATE ON public.performance_metrics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate performance grades
CREATE OR REPLACE FUNCTION calculate_performance_grades()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate overall grade
    IF NEW.sharpe_ratio >= 2.0 AND NEW.max_drawdown <= 0.1 AND NEW.win_rate >= 60 THEN
        NEW.overall_grade := 'A+';
    ELSIF NEW.sharpe_ratio >= 1.5 AND NEW.max_drawdown <= 0.15 AND NEW.win_rate >= 55 THEN
        NEW.overall_grade := 'A';
    ELSIF NEW.sharpe_ratio >= 1.2 AND NEW.max_drawdown <= 0.20 AND NEW.win_rate >= 50 THEN
        NEW.overall_grade := 'A-';
    ELSIF NEW.sharpe_ratio >= 1.0 AND NEW.max_drawdown <= 0.25 AND NEW.win_rate >= 45 THEN
        NEW.overall_grade := 'B+';
    ELSIF NEW.sharpe_ratio >= 0.8 AND NEW.max_drawdown <= 0.30 AND NEW.win_rate >= 40 THEN
        NEW.overall_grade := 'B';
    ELSIF NEW.sharpe_ratio >= 0.6 AND NEW.max_drawdown <= 0.35 AND NEW.win_rate >= 35 THEN
        NEW.overall_grade := 'B-';
    ELSIF NEW.sharpe_ratio >= 0.4 AND NEW.max_drawdown <= 0.40 AND NEW.win_rate >= 30 THEN
        NEW.overall_grade := 'C+';
    ELSIF NEW.sharpe_ratio >= 0.2 AND NEW.max_drawdown <= 0.50 AND NEW.win_rate >= 25 THEN
        NEW.overall_grade := 'C';
    ELSIF NEW.sharpe_ratio >= 0.0 AND NEW.max_drawdown <= 0.60 AND NEW.win_rate >= 20 THEN
        NEW.overall_grade := 'C-';
    ELSIF NEW.sharpe_ratio >= -0.2 AND NEW.max_drawdown <= 0.70 AND NEW.win_rate >= 15 THEN
        NEW.overall_grade := 'D+';
    ELSIF NEW.sharpe_ratio >= -0.5 AND NEW.max_drawdown <= 0.80 AND NEW.win_rate >= 10 THEN
        NEW.overall_grade := 'D';
    ELSIF NEW.sharpe_ratio >= -1.0 AND NEW.max_drawdown <= 0.90 AND NEW.win_rate >= 5 THEN
        NEW.overall_grade := 'D-';
    ELSE
        NEW.overall_grade := 'F';
    END IF;

    -- Calculate profitability grade
    IF NEW.profit_factor >= 3.0 THEN
        NEW.profitability_grade := 'A+';
    ELSIF NEW.profit_factor >= 2.5 THEN
        NEW.profitability_grade := 'A';
    ELSIF NEW.profit_factor >= 2.0 THEN
        NEW.profitability_grade := 'A-';
    ELSIF NEW.profit_factor >= 1.8 THEN
        NEW.profitability_grade := 'B+';
    ELSIF NEW.profit_factor >= 1.6 THEN
        NEW.profitability_grade := 'B';
    ELSIF NEW.profit_factor >= 1.4 THEN
        NEW.profitability_grade := 'B-';
    ELSIF NEW.profit_factor >= 1.2 THEN
        NEW.profitability_grade := 'C+';
    ELSIF NEW.profit_factor >= 1.0 THEN
        NEW.profitability_grade := 'C';
    ELSIF NEW.profit_factor >= 0.8 THEN
        NEW.profitability_grade := 'C-';
    ELSIF NEW.profit_factor >= 0.6 THEN
        NEW.profitability_grade := 'D+';
    ELSIF NEW.profit_factor >= 0.4 THEN
        NEW.profitability_grade := 'D';
    ELSIF NEW.profit_factor >= 0.2 THEN
        NEW.profitability_grade := 'D-';
    ELSE
        NEW.profitability_grade := 'F';
    END IF;

    -- Calculate risk grade (inverse of drawdown)
    IF NEW.max_drawdown <= 0.05 THEN
        NEW.risk_grade := 'A+';
    ELSIF NEW.max_drawdown <= 0.10 THEN
        NEW.risk_grade := 'A';
    ELSIF NEW.max_drawdown <= 0.15 THEN
        NEW.risk_grade := 'A-';
    ELSIF NEW.max_drawdown <= 0.20 THEN
        NEW.risk_grade := 'B+';
    ELSIF NEW.max_drawdown <= 0.25 THEN
        NEW.risk_grade := 'B';
    ELSIF NEW.max_drawdown <= 0.30 THEN
        NEW.risk_grade := 'B-';
    ELSIF NEW.max_drawdown <= 0.40 THEN
        NEW.risk_grade := 'C+';
    ELSIF NEW.max_drawdown <= 0.50 THEN
        NEW.risk_grade := 'C';
    ELSIF NEW.max_drawdown <= 0.60 THEN
        NEW.risk_grade := 'C-';
    ELSIF NEW.max_drawdown <= 0.70 THEN
        NEW.risk_grade := 'D+';
    ELSIF NEW.max_drawdown <= 0.80 THEN
        NEW.risk_grade := 'D';
    ELSIF NEW.max_drawdown <= 0.90 THEN
        NEW.risk_grade := 'D-';
    ELSE
        NEW.risk_grade := 'F';
    END IF;

    -- Calculate consistency grade based on stability and predictability
    DECLARE
        avg_consistency DECIMAL(5,2) := (NEW.consistency_score + NEW.stability_score + NEW.predictability_score) / 3.0;
    BEGIN
        IF avg_consistency >= 90 THEN
            NEW.consistency_grade := 'A+';
        ELSIF avg_consistency >= 80 THEN
            NEW.consistency_grade := 'A';
        ELSIF avg_consistency >= 70 THEN
            NEW.consistency_grade := 'A-';
        ELSIF avg_consistency >= 60 THEN
            NEW.consistency_grade := 'B+';
        ELSIF avg_consistency >= 50 THEN
            NEW.consistency_grade := 'B';
        ELSIF avg_consistency >= 40 THEN
            NEW.consistency_grade := 'B-';
        ELSIF avg_consistency >= 30 THEN
            NEW.consistency_grade := 'C+';
        ELSIF avg_consistency >= 20 THEN
            NEW.consistency_grade := 'C';
        ELSIF avg_consistency >= 10 THEN
            NEW.consistency_grade := 'C-';
        ELSE
            NEW.consistency_grade := 'D';
        END IF;
    END;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER calculate_performance_grades_trigger
    BEFORE INSERT OR UPDATE ON public.performance_metrics
    FOR EACH ROW
    EXECUTE FUNCTION calculate_performance_grades();

-- Comment for documentation
COMMENT ON TABLE public.performance_metrics IS 'Comprehensive performance metrics and analytics for trading strategies including risk-adjusted returns, drawdown analysis, and performance grading';