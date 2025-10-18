-- Advanced Analytics Functions and Views for Enhanced Trade Logging

-- Function to calculate comprehensive performance metrics
CREATE OR REPLACE FUNCTION calculate_comprehensive_performance_metrics(
    p_user_id UUID DEFAULT NULL,
    p_symbol TEXT DEFAULT NULL,
    p_strategy_id TEXT DEFAULT NULL,
    p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
    total_trades INTEGER,
    winning_trades INTEGER,
    win_rate DECIMAL(5,2),
    total_profit DECIMAL(20,10),
    total_loss DECIMAL(20,10),
    net_profit DECIMAL(20,10),
    profit_factor DECIMAL(15,8),
    sharpe_ratio DECIMAL(15,8),
    max_drawdown DECIMAL(15,8),
    average_trade DECIMAL(20,10),
    largest_win DECIMAL(20,10),
    largest_loss DECIMAL(20,10),
    avg_win DECIMAL(20,10),
    avg_loss DECIMAL(20,10),
    current_drawdown DECIMAL(15,8),
    recovery_factor DECIMAL(15,8),
    risk_adjusted_return DECIMAL(15,8),
    consistency_score DECIMAL(5,2),
    overall_grade TEXT
) AS $$
DECLARE
    v_start_date TIMESTAMP WITH TIME ZONE := COALESCE(p_start_date, now() - interval '30 days');
    v_end_date TIMESTAMP WITH TIME ZONE := COALESCE(p_end_date, now());
BEGIN
    RETURN QUERY
    WITH trade_data AS (
        SELECT
            ms.*,
            COALESCE(sm.confidence_level, 0) as signal_confidence,
            COALESCE(ed.execution_quality_score, 0) as execution_quality,
            COALESCE(mc.market_regime, 'unknown') as market_regime,
            COALESCE(mc.volatility_state, 'normal') as volatility_state,
            COALESCE(mc.session_info, 'unknown') as session_info
        FROM public.mt5_signals ms
        LEFT JOIN public.signal_metadata sm ON ms.signal_metadata_id = sm.id
        LEFT JOIN public.execution_details ed ON ms.execution_details_id = ed.id
        LEFT JOIN public.market_context mc ON ms.market_context_id = mc.id
        WHERE
            (p_user_id IS NULL OR ms.user_id = p_user_id)
            AND (p_symbol IS NULL OR ms.symbol = p_symbol)
            AND (p_strategy_id IS NULL OR ms.strategy_id = p_strategy_id)
            AND ms.status = 'closed'
            AND ms.closed_at BETWEEN v_start_date AND v_end_date
    ),
    profit_series AS (
        SELECT
            actual_profit,
            closed_at,
            actual_profit - LAG(actual_profit, 1, 0) OVER (ORDER BY closed_at) as daily_return
        FROM trade_data
        ORDER BY closed_at
    ),
    equity_curve AS (
        SELECT
            closed_at,
            actual_profit,
            SUM(actual_profit) OVER (ORDER BY closed_at) as cumulative_profit,
            SUM(actual_profit) OVER (ORDER BY closed_at) as peak_equity,
            SUM(actual_profit) OVER (ORDER BY closed_at) - MIN(SUM(actual_profit) OVER (ORDER BY closed_at)) OVER (ORDER BY closed_at) as drawdown
        FROM trade_data
        ORDER BY closed_at
    )
    SELECT
        COUNT(*) as total_trades,
        COUNT(CASE WHEN actual_profit > 0 THEN 1 END) as winning_trades,
        ROUND(COUNT(CASE WHEN actual_profit > 0 THEN 1 END) * 100.0 / COUNT(*), 2) as win_rate,
        COALESCE(SUM(CASE WHEN actual_profit > 0 THEN actual_profit ELSE 0 END), 0) as total_profit,
        COALESCE(SUM(CASE WHEN actual_profit < 0 THEN actual_profit ELSE 0 END), 0) as total_loss,
        COALESCE(SUM(actual_profit), 0) as net_profit,
        CASE
            WHEN SUM(CASE WHEN actual_profit < 0 THEN actual_profit ELSE 0 END) = 0 THEN 0
            ELSE ABS(SUM(CASE WHEN actual_profit > 0 THEN actual_profit ELSE 0 END) / SUM(CASE WHEN actual_profit < 0 THEN actual_profit ELSE 0 END))
        END as profit_factor,
        CASE
            WHEN COUNT(*) < 2 THEN 0
            ELSE (AVG(daily_return) / STDDEV(daily_return)) * SQRT(252)
        END as sharpe_ratio,
        COALESCE(MAX(drawdown), 0) as max_drawdown,
        COALESCE(AVG(actual_profit), 0) as average_trade,
        COALESCE(MAX(actual_profit), 0) as largest_win,
        COALESCE(MIN(actual_profit), 0) as largest_loss,
        COALESCE(AVG(CASE WHEN actual_profit > 0 THEN actual_profit END), 0) as avg_win,
        COALESCE(AVG(CASE WHEN actual_profit < 0 THEN actual_profit END), 0) as avg_loss,
        COALESCE((SELECT drawdown FROM equity_curve ORDER BY closed_at DESC LIMIT 1), 0) as current_drawdown,
        CASE
            WHEN MAX(drawdown) = 0 THEN 0
            ELSE ABS(SUM(actual_profit) / MAX(drawdown))
        END as recovery_factor,
        CASE
            WHEN STDDEV(actual_profit) = 0 THEN 0
            ELSE AVG(actual_profit) / STDDEV(actual_profit)
        END as risk_adjusted_return,
        ROUND(
            (COUNT(CASE WHEN actual_profit > 0 THEN 1 END) * 100.0 / COUNT(*)) *
            (1 - (MAX(drawdown) * 2)) *
            CASE
                WHEN STDDEV(actual_profit) = 0 THEN 1
                ELSE 1 / (1 + STDDEV(actual_profit) / ABS(AVG(actual_profit)))
            END * 100, 2
        ) as consistency_score,
        CASE
            WHEN (AVG(daily_return) / STDDEV(daily_return)) * SQRT(252) >= 2.0 AND MAX(drawdown) <= 0.1 AND (COUNT(CASE WHEN actual_profit > 0 THEN 1 END) * 100.0 / COUNT(*)) >= 60 THEN 'A+'
            WHEN (AVG(daily_return) / STDDEV(daily_return)) * SQRT(252) >= 1.5 AND MAX(drawdown) <= 0.15 AND (COUNT(CASE WHEN actual_profit > 0 THEN 1 END) * 100.0 / COUNT(*)) >= 55 THEN 'A'
            WHEN (AVG(daily_return) / STDDEV(daily_return)) * SQRT(252) >= 1.2 AND MAX(drawdown) <= 0.20 AND (COUNT(CASE WHEN actual_profit > 0 THEN 1 END) * 100.0 / COUNT(*)) >= 50 THEN 'A-'
            WHEN (AVG(daily_return) / STDDEV(daily_return)) * SQRT(252) >= 1.0 AND MAX(drawdown) <= 0.25 AND (COUNT(CASE WHEN actual_profit > 0 THEN 1 END) * 100.0 / COUNT(*)) >= 45 THEN 'B+'
            WHEN (AVG(daily_return) / STDDEV(daily_return)) * SQRT(252) >= 0.8 AND MAX(drawdown) <= 0.30 AND (COUNT(CASE WHEN actual_profit > 0 THEN 1 END) * 100.0 / COUNT(*)) >= 40 THEN 'B'
            WHEN (AVG(daily_return) / STDDEV(daily_return)) * SQRT(252) >= 0.6 AND MAX(drawdown) <= 0.35 AND (COUNT(CASE WHEN actual_profit > 0 THEN 1 END) * 100.0 / COUNT(*)) >= 35 THEN 'B-'
            ELSE 'C'
        END as overall_grade
    FROM trade_data
    LEFT JOIN profit_series ps ON trade_data.actual_profit = ps.actual_profit
    LEFT JOIN equity_curve ec ON trade_data.closed_at = ec.closed_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for comprehensive trading dashboard
CREATE OR REPLACE VIEW enhanced_trading_dashboard AS
SELECT
    u.id as user_id,
    u.email,

    -- Basic statistics
    COALESCE(stats.total_trades, 0) as total_trades,
    COALESCE(stats.winning_trades, 0) as winning_trades,
    COALESCE(stats.win_rate, 0) as win_rate,
    COALESCE(stats.total_profit, 0) as total_profit,
    COALESCE(stats.total_loss, 0) as total_loss,
    COALESCE(stats.net_profit, 0) as net_profit,
    COALESCE(stats.profit_factor, 0) as profit_factor,
    COALESCE(stats.sharpe_ratio, 0) as sharpe_ratio,
    COALESCE(stats.max_drawdown, 0) as max_drawdown,
    COALESCE(stats.overall_grade, 'N/A') as overall_grade,

    -- Recent performance
    COALESCE(recent_stats.total_trades, 0) as recent_trades_7d,
    COALESCE(recent_stats.win_rate, 0) as recent_win_rate_7d,
    COALESCE(recent_stats.net_profit, 0) as recent_net_profit_7d,

    -- Active trades
    COALESCE(active_trades.count, 0) as active_trades_count,
    COALESCE(active_trades.total_profit, 0) as active_trades_profit,

    -- Market regime performance
    COALESCE(regime_perf.trending_performance, 0) as trending_performance,
    COALESCE(regime_perf.ranging_performance, 0) as ranging_performance,
    COALESCE(regime_perf.volatile_performance, 0) as volatile_performance,

    -- AI model performance
    COALESCE(ai_performance.model_accuracy, 0) as ai_model_accuracy,
    COALESCE(ai_performance.avg_confidence, 0) as ai_avg_confidence,
    COALESCE(ai_performance.model_precision, 0) as ai_model_precision,

    -- Execution quality
    COALESCE(exec_quality.avg_execution_score, 0) as avg_execution_quality,
    COALESCE(exec_quality.avg_slippage, 0) as avg_slippage,
    COALESCE(exec_quality.avg_latency_ms, 0) as avg_latency_ms,

    -- Strategy breakdown
    COALESCE(strategy_breakdown.total_strategies, 0) as total_strategies,
    COALESCE(strategy_breakdown.best_strategy, 'N/A') as best_strategy,
    COALESCE(strategy_breakdown.best_strategy_profit, 0) as best_strategy_profit,

    -- Recent activity
    COALESCE(recent_activity.last_signal_time, 'N/A') as last_signal_time,
    COALESCE(recent_activity.last_trade_time, 'N/A') as last_trade_time,
    COALESCE(recent_activity.signals_today, 0) as signals_today,
    COALESCE(recent_activity.trades_today, 0) as trades_today,

    -- Risk metrics
    COALESCE(risk_metrics.current_drawdown, 0) as current_drawdown,
    COALESCE(risk_metrics.risk_score, 0) as risk_score,
    COALESCE(risk_metrics.consecutive_losses, 0) as consecutive_losses,
    COALESCE(risk_metrics.consecutive_wins, 0) as consecutive_wins,

    -- Timestamp
    now() as calculated_at

FROM auth.users u
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) as total_trades,
        COUNT(CASE WHEN actual_profit > 0 THEN 1 END) as winning_trades,
        ROUND(COUNT(CASE WHEN actual_profit > 0 THEN 1 END) * 100.0 / COUNT(*), 2) as win_rate,
        COALESCE(SUM(CASE WHEN actual_profit > 0 THEN actual_profit ELSE 0 END), 0) as total_profit,
        COALESCE(SUM(CASE WHEN actual_profit < 0 THEN actual_profit ELSE 0 END), 0) as total_loss,
        COALESCE(SUM(actual_profit), 0) as net_profit,
        CASE
            WHEN SUM(CASE WHEN actual_profit < 0 THEN actual_profit ELSE 0 END) = 0 THEN 0
            ELSE ABS(SUM(CASE WHEN actual_profit > 0 THEN actual_profit ELSE 0 END) / SUM(CASE WHEN actual_profit < 0 THEN actual_profit ELSE 0 END))
        END as profit_factor,
        0 as sharpe_ratio, -- Simplified for view
        0 as max_drawdown, -- Simplified for view
        'C' as overall_grade -- Default grade
    FROM public.mt5_signals
    WHERE user_id = u.id AND status = 'closed'
) stats ON true

LEFT JOIN LATERAL (
    SELECT
        COUNT(*) as total_trades,
        ROUND(COUNT(CASE WHEN actual_profit > 0 THEN 1 END) * 100.0 / COUNT(*), 2) as win_rate,
        COALESCE(SUM(actual_profit), 0) as net_profit
    FROM public.mt5_signals
    WHERE user_id = u.id AND status = 'closed' AND closed_at >= now() - interval '7 days'
) recent_stats ON true

LEFT JOIN LATERAL (
    SELECT
        COUNT(*) as count,
        COALESCE(SUM(current_profit), 0) as total_profit
    FROM public.mt5_signals
    WHERE user_id = u.id AND status = 'opened'
) active_trades ON true

LEFT JOIN LATERAL (
    SELECT
        COALESCE(AVG(CASE WHEN mc.market_regime LIKE '%trending%' THEN actual_profit END), 0) as trending_performance,
        COALESCE(AVG(CASE WHEN mc.market_regime = 'ranging' THEN actual_profit END), 0) as ranging_performance,
        COALESCE(AVG(CASE WHEN mc.volatility_state IN ('high', 'extreme') THEN actual_profit END), 0) as volatile_performance
    FROM public.mt5_signals ms
    LEFT JOIN public.market_context mc ON ms.market_context_id = mc.id
    WHERE ms.user_id = u.id AND ms.status = 'closed'
) regime_perf ON true

LEFT JOIN LATERAL (
    SELECT
        COALESCE(AVG(sm.ai_confidence_score), 0) as model_accuracy,
        COALESCE(AVG(sm.confidence_level), 0) as avg_confidence,
        COALESCE(AVG(pm.model_precision), 0) as model_precision
    FROM public.mt5_signals ms
    LEFT JOIN public.signal_metadata sm ON ms.signal_metadata_id = sm.id
    LEFT JOIN public.performance_metrics pm ON ms.performance_metrics_id = pm.id
    WHERE ms.user_id = u.id
) ai_performance ON true

LEFT JOIN LATERAL (
    SELECT
        COALESCE(AVG(ed.execution_quality_score), 0) as avg_execution_score,
        COALESCE(AVG(ed.slippage_percentage), 0) as avg_slippage,
        COALESCE(AVG(ed.total_execution_ms), 0) as avg_latency_ms
    FROM public.mt5_signals ms
    LEFT JOIN public.execution_details ed ON ms.execution_details_id = ed.id
    WHERE ms.user_id = u.id
) exec_quality ON true

LEFT JOIN LATERAL (
    SELECT
        COUNT(DISTINCT strategy_id) as total_strategies,
        FIRST_VALUE(strategy_id) OVER (PARTITION BY 1 ORDER BY SUM(actual_profit) DESC) as best_strategy,
        MAX(SUM(actual_profit)) OVER (PARTITION BY 1) as best_strategy_profit
    FROM public.mt5_signals
    WHERE user_id = u.id AND status = 'closed' AND strategy_id IS NOT NULL
    GROUP BY strategy_id
    LIMIT 1
) strategy_breakdown ON true

LEFT JOIN LATERAL (
    SELECT
        MAX(created_at) as last_signal_time,
        MAX(closed_at) as last_trade_time,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as signals_today,
        COUNT(CASE WHEN closed_at >= CURRENT_DATE THEN 1 END) as trades_today
    FROM public.mt5_signals
    WHERE user_id = u.id
) recent_activity ON true

LEFT JOIN LATERAL (
    SELECT
        0 as current_drawdown, -- Simplified for view
        COALESCE(AVG(sm.risk_score), 0) as risk_score,
        0 as consecutive_losses, -- Would need window function for this
        0 as consecutive_wins -- Would need window function for this
    FROM public.mt5_signals ms
    LEFT JOIN public.signal_metadata sm ON ms.signal_metadata_id = sm.id
    WHERE ms.user_id = u.id
) risk_metrics ON true

WHERE u.id IN (
    SELECT id FROM auth.users
    WHERE created_at >= now() - interval '365 days'
    OR id IN (SELECT user_id FROM public.mt5_signals)
);

-- View for market regime analysis
CREATE OR REPLACE VIEW market_regime_analysis AS
SELECT
    mc.market_regime,
    mc.volatility_state,
    mc.session_info,
    ms.symbol,

    -- Trade statistics
    COUNT(ms.id) as trade_count,
    COUNT(CASE WHEN ms.actual_profit > 0 THEN 1 END) as winning_trades,
    COUNT(CASE WHEN ms.actual_profit < 0 THEN 1 END) as losing_trades,

    -- Performance metrics
    ROUND(COUNT(CASE WHEN ms.actual_profit > 0 THEN 1 END) * 100.0 / COUNT(ms.id), 2) as win_rate,
    COALESCE(AVG(ms.actual_profit), 0) as avg_profit,
    COALESCE(SUM(ms.actual_profit), 0) as total_profit,
    COALESCE(STDDEV(ms.actual_profit), 0) as profit_stddev,

    -- Risk metrics
    COALESCE(MIN(ms.actual_profit), 0) as worst_trade,
    COALESCE(MAX(ms.actual_profit), 0) as best_trade,
    COALESCE(AVG(ms.risk_amount), 0) as avg_risk,

    -- Signal characteristics
    COALESCE(AVG(sm.confidence_level), 0) as avg_confidence,
    COALESCE(AVG(sm.ai_confidence_score), 0) as avg_ai_confidence,

    -- Execution quality
    COALESCE(AVG(ed.execution_quality_score), 0) as avg_execution_quality,
    COALESCE(AVG(ed.slippage_percentage), 0) as avg_slippage,

    -- Time period
    MIN(mc.context_timestamp) as period_start,
    MAX(mc.context_timestamp) as period_end,
    EXTRACT(EPOCH FROM (MAX(mc.context_timestamp) - MIN(mc.context_timestamp))) / 3600 as duration_hours

FROM public.mt5_signals ms
LEFT JOIN public.market_context mc ON ms.market_context_id = mc.id
LEFT JOIN public.signal_metadata sm ON ms.signal_metadata_id = sm.id
LEFT JOIN public.execution_details ed ON ms.execution_details_id = ed.id
WHERE ms.status = 'closed' AND mc.market_regime IS NOT NULL
GROUP BY mc.market_regime, mc.volatility_state, mc.session_info, ms.symbol
ORDER BY trade_count DESC, win_rate DESC;

-- View for signal chain tracking
CREATE OR REPLACE VIEW signal_chain_analysis AS
WITH signal_chain AS (
    SELECT
        ms.id,
        ms.signal,
        ms.symbol,
        ms.entry,
        ms.status,
        ms.created_at,
        ms.closed_at,
        ms.actual_profit,
        ms.signal_chain_id,
        ms.parent_signal_id,
        ms.generation_timestamp,
        sm.signal_type,
        sm.confidence_level,
        sm.ai_model_name,
        mc.market_regime,
        mc.volatility_state,

        -- Chain position
        COUNT(*) OVER (PARTITION BY ms.signal_chain_id ORDER BY ms.created_at) as chain_position,
        COUNT(*) OVER (PARTITION BY ms.signal_chain_id) as chain_length,

        -- Chain performance
        COALESCE(SUM(ms.actual_profit) OVER (PARTITION BY ms.signal_chain_id), 0) as chain_total_profit,
        COALESCE(AVG(ms.actual_profit) OVER (PARTITION BY ms.signal_chain_id), 0) as chain_avg_profit,
        COALESCE(MAX(ms.actual_profit) OVER (PARTITION BY ms.signal_chain_id), 0) as chain_max_profit,
        COALESCE(MIN(ms.actual_profit) OVER (PARTITION BY ms.signal_chain_id), 0) as chain_min_profit

    FROM public.mt5_signals ms
    LEFT JOIN public.signal_metadata sm ON ms.signal_metadata_id = sm.id
    LEFT JOIN public.market_context mc ON ms.market_context_id = mc.id
    WHERE ms.signal_chain_id IS NOT NULL
)
SELECT
    signal_chain_id,
    symbol,
    MIN(created_at) as chain_start_time,
    MAX(COALESCE(closed_at, created_at)) as chain_end_time,
    chain_length,

    -- Chain performance
    chain_total_profit,
    chain_avg_profit,
    chain_max_profit,
    chain_min_profit,
    COUNT(CASE WHEN actual_profit > 0 THEN 1 END) as chain_winning_trades,
    ROUND(COUNT(CASE WHEN actual_profit > 0 THEN 1 END) * 100.0 / COUNT(*), 2) as chain_win_rate,

    -- Chain characteristics
    AVG(confidence_level) as avg_confidence,
    STRING_AGG(DISTINCT ai_model_name, ', ') as models_used,
    STRING_AGG(DISTINCT market_regime, ', ') as market_regimes,
    STRING_AGG(DISTINCT volatility_state, ', ') as volatility_states,

    -- Duration
    EXTRACT(EPOCH FROM (MAX(COALESCE(closed_at, created_at)) - MIN(created_at))) / 3600 as duration_hours,

    -- Chain efficiency
    CASE
        WHEN chain_length = 1 THEN 'single_signal'
        WHEN chain_win_rate >= 70 THEN 'highly_effective'
        WHEN chain_win_rate >= 50 THEN 'moderately_effective'
        ELSE 'ineffective'
    END as chain_efficiency,

    -- Chain risk
    STDDEV(actual_profit) as profit_volatility,
    COALESCE(MAX(actual_profit) / ABS(MIN(actual_profit)), 0) as profit_ratio

FROM signal_chain
GROUP BY signal_chain_id, symbol, chain_length, chain_total_profit, chain_avg_profit, chain_max_profit, chain_min_profit
ORDER BY chain_start_time DESC;

-- Grant permissions for views
GRANT SELECT ON enhanced_trading_dashboard TO authenticated;
GRANT SELECT ON market_regime_analysis TO authenticated;
GRANT SELECT ON signal_chain_analysis TO authenticated;

-- Grant permissions for functions
GRANT EXECUTE ON FUNCTION calculate_comprehensive_performance_metrics TO authenticated;

-- Comments for documentation
COMMENT ON VIEW enhanced_trading_dashboard IS 'Comprehensive trading dashboard view showing performance metrics, risk analysis, and recent activity';
COMMENT ON VIEW market_regime_analysis IS 'Analysis of trading performance across different market regimes and conditions';
COMMENT ON VIEW signal_chain_analysis IS 'Analysis of signal chains showing how related signals perform together';
COMMENT ON FUNCTION calculate_comprehensive_performance_metrics IS 'Calculate comprehensive performance metrics with filtering options for user, symbol, strategy, and date range';