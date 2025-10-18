-- ============================================================================
-- ENSEMBLE SYSTEM DASHBOARD - SQL Queries
-- Comprehensive monitoring and analytics for ensemble trading system
-- ============================================================================

-- ============================================================================
-- 1. PERFORMANCE OVERVIEW
-- ============================================================================

-- Overall performance by signal type
CREATE OR REPLACE VIEW ensemble_performance_overview AS
SELECT
  signal_type,
  COUNT(*) as total_signals,
  COUNT(*) FILTER (WHERE win = true) as wins,
  COUNT(*) FILTER (WHERE win = false) as losses,
  ROUND(
    ((COUNT(*) FILTER (WHERE win = true)::FLOAT /
     NULLIF(COUNT(*) FILTER (WHERE win IS NOT NULL), 0)) * 100)::NUMERIC,
    2
  ) as win_rate_percent,
  ROUND(AVG(confidence)::NUMERIC, 2) as avg_confidence,
  ROUND(AVG(actual_result)::NUMERIC, 2) as avg_pnl,
  ROUND(SUM(actual_result)::NUMERIC, 2) as total_pnl,
  ROUND(STDDEV(actual_result)::NUMERIC, 2) as pnl_stddev,
  CASE
    WHEN STDDEV(actual_result) > 0 THEN
      ROUND((AVG(actual_result) / STDDEV(actual_result))::NUMERIC, 2)
    ELSE 0
  END as sharpe_ratio,
  MAX(created_at) as last_signal_at
FROM signal_performance
WHERE win IS NOT NULL
GROUP BY signal_type
ORDER BY win_rate_percent DESC NULLS LAST;

COMMENT ON VIEW ensemble_performance_overview IS 'Overall performance metrics by signal type (classic, ml, ensemble)';

-- ============================================================================
-- 2. SYMBOL-SPECIFIC PERFORMANCE
-- ============================================================================

-- Performance breakdown by symbol
CREATE OR REPLACE VIEW symbol_performance_detail AS
SELECT
  symbol,
  signal_type,
  COUNT(*) as trades,
  ROUND(
    ((COUNT(*) FILTER (WHERE win = true)::FLOAT /
     NULLIF(COUNT(*) FILTER (WHERE win IS NOT NULL), 0)) * 100)::NUMERIC,
    1
  ) as win_rate,
  ROUND(AVG(confidence)::NUMERIC, 1) as avg_confidence,
  ROUND(SUM(actual_result)::NUMERIC, 2) as total_pnl,
  ROUND(AVG(actual_result) FILTER (WHERE win = true)::NUMERIC, 2) as avg_win,
  ROUND(AVG(actual_result) FILTER (WHERE win = false)::NUMERIC, 2) as avg_loss,
  ROUND(
    ((AVG(actual_result) FILTER (WHERE win = true) /
     NULLIF(ABS(AVG(actual_result) FILTER (WHERE win = false)), 0)))::NUMERIC,
    2
  ) as win_loss_ratio
FROM signal_performance
WHERE win IS NOT NULL
GROUP BY symbol, signal_type
ORDER BY symbol, win_rate DESC NULLS LAST;

COMMENT ON VIEW symbol_performance_detail IS 'Detailed performance breakdown per symbol and signal type';

-- ============================================================================
-- 3. CONTEXT-AWARE PERFORMANCE
-- ============================================================================

-- Performance by market context
CREATE OR REPLACE VIEW context_performance_matrix AS
SELECT
  market_regime,
  session_type,
  signal_type,
  COUNT(*) as trades,
  ROUND(
    ((COUNT(*) FILTER (WHERE win = true)::FLOAT /
     NULLIF(COUNT(*), 0)) * 100)::NUMERIC,
    1
  ) as win_rate,
  ROUND(AVG(actual_result)::NUMERIC, 2) as avg_pnl,
  ROUND(AVG(confidence)::NUMERIC, 1) as avg_conf
FROM signal_performance
WHERE win IS NOT NULL
GROUP BY market_regime, session_type, signal_type
HAVING COUNT(*) >= 5  -- Minimum 5 trades for statistical relevance
ORDER BY market_regime, session_type, win_rate DESC;

COMMENT ON VIEW context_performance_matrix IS 'Win rates by market regime, session, and signal type';

-- ============================================================================
-- 4. ENSEMBLE WEIGHTS MONITORING
-- ============================================================================

-- Current ensemble weights with performance
CREATE OR REPLACE VIEW ensemble_weights_status AS
SELECT
  ew.symbol,
  ew.classic_weight,
  ew.ml_weight,
  ew.classic_win_rate,
  ew.ml_win_rate,
  ew.sample_size,
  ew.last_recalculated,
  -- Recent performance (last 10 trades)
  (SELECT ROUND(
    (COUNT(*) FILTER (WHERE win = true)::FLOAT / NULLIF(COUNT(*), 0) * 100)::NUMERIC, 1
   )
   FROM (
     SELECT win
     FROM signal_performance sp
     WHERE sp.symbol = ew.symbol
       AND sp.signal_type = 'ensemble'
       AND sp.win IS NOT NULL
     ORDER BY sp.created_at DESC
     LIMIT 10
   ) recent
  ) as recent_ensemble_wr,
  -- Days since last update
  EXTRACT(EPOCH FROM (now() - ew.last_recalculated)) / 86400 as days_since_update
FROM ensemble_weights ew
ORDER BY ew.sample_size DESC NULLS LAST;

COMMENT ON VIEW ensemble_weights_status IS 'Current weights and recent performance';

-- ============================================================================
-- 5. CONFIDENCE CALIBRATION
-- ============================================================================

-- Check if confidence levels match actual win rates (calibration)
CREATE OR REPLACE VIEW confidence_calibration AS
SELECT
  signal_type,
  CASE
    WHEN confidence >= 80 THEN '80-100%'
    WHEN confidence >= 70 THEN '70-79%'
    WHEN confidence >= 60 THEN '60-69%'
    WHEN confidence >= 50 THEN '50-59%'
    ELSE '<50%'
  END as confidence_bucket,
  COUNT(*) as total_signals,
  ROUND(AVG(confidence)::NUMERIC, 1) as avg_confidence,
  ROUND(
    ((COUNT(*) FILTER (WHERE win = true)::FLOAT /
     NULLIF(COUNT(*), 0)) * 100)::NUMERIC,
    1
  ) as actual_win_rate,
  ROUND(
    (ABS(AVG(confidence) -
        (COUNT(*) FILTER (WHERE win = true)::FLOAT / NULLIF(COUNT(*), 0)) * 100
    ))::NUMERIC,
    1
  ) as calibration_error
FROM signal_performance
WHERE win IS NOT NULL
GROUP BY signal_type, confidence_bucket
ORDER BY signal_type, confidence_bucket DESC;

COMMENT ON VIEW confidence_calibration IS 'Confidence calibration - predicted vs actual win rate';

-- ============================================================================
-- 6. RECENT ACTIVITY
-- ============================================================================

-- Last 20 signals with full details
CREATE OR REPLACE VIEW recent_signals_detail AS
SELECT
  sp.id,
  sp.symbol,
  sp.signal_type,
  sp.predicted_direction,
  sp.confidence,
  sp.entry_price,
  sp.stop_loss,
  sp.take_profit,
  sp.actual_result,
  sp.win,
  sp.ml_action,
  sp.ml_confidence,
  sp.agreement,
  sp.ml_recommendation,
  sp.market_regime,
  sp.session_type,
  sp.created_at,
  sp.result_timestamp
FROM signal_performance sp
ORDER BY sp.created_at DESC
LIMIT 20;

COMMENT ON VIEW recent_signals_detail IS 'Most recent 20 signals with all details';

-- ============================================================================
-- 7. ML VALIDATION INSIGHTS
-- ============================================================================

-- ML validation effectiveness
CREATE OR REPLACE VIEW ml_validation_effectiveness AS
SELECT
  agreement,
  ml_recommendation,
  COUNT(*) as signals,
  ROUND(
    ((COUNT(*) FILTER (WHERE win = true)::FLOAT /
     NULLIF(COUNT(*), 0)) * 100)::NUMERIC,
    1
  ) as win_rate,
  ROUND(AVG(confidence)::NUMERIC, 1) as avg_confidence,
  ROUND(AVG(ml_confidence)::NUMERIC, 1) as avg_ml_confidence,
  ROUND(AVG(actual_result)::NUMERIC, 2) as avg_pnl
FROM signal_performance
WHERE win IS NOT NULL
  AND ml_action IS NOT NULL
GROUP BY agreement, ml_recommendation
ORDER BY win_rate DESC NULLS LAST;

COMMENT ON VIEW ml_validation_effectiveness IS 'How ML validation affects outcomes';

-- ============================================================================
-- 8. TIME-BASED ANALYSIS
-- ============================================================================

-- Performance by day of week and hour
CREATE OR REPLACE VIEW temporal_performance AS
SELECT
  EXTRACT(DOW FROM created_at) as day_of_week,
  CASE EXTRACT(DOW FROM created_at)
    WHEN 0 THEN 'Sunday'
    WHEN 1 THEN 'Monday'
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
  END as day_name,
  EXTRACT(HOUR FROM created_at) as hour_utc,
  COUNT(*) as signals,
  ROUND(
    ((COUNT(*) FILTER (WHERE win = true)::FLOAT /
     NULLIF(COUNT(*), 0)) * 100)::NUMERIC,
    1
  ) as win_rate,
  ROUND(AVG(actual_result)::NUMERIC, 2) as avg_pnl
FROM signal_performance
WHERE win IS NOT NULL
GROUP BY day_of_week, day_name, hour_utc
HAVING COUNT(*) >= 3
ORDER BY day_of_week, hour_utc;

COMMENT ON VIEW temporal_performance IS 'Performance patterns by day and hour';

-- ============================================================================
-- 9. DRAWDOWN ANALYSIS
-- ============================================================================

-- Running P&L and drawdown tracking with proper max drawdown calculation
DROP VIEW IF EXISTS pnl_drawdown_analysis;

CREATE OR REPLACE VIEW pnl_drawdown_analysis AS
WITH running_pnl AS (
  SELECT
    symbol,
    signal_type,
    actual_result,
    created_at,
    SUM(actual_result) OVER (
      PARTITION BY symbol, signal_type
      ORDER BY created_at
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) as cumulative_pnl
  FROM signal_performance
  WHERE win IS NOT NULL
),
peak_and_drawdown AS (
  SELECT
    symbol,
    signal_type,
    cumulative_pnl,
    MAX(cumulative_pnl) OVER (
      PARTITION BY symbol, signal_type
      ORDER BY created_at
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) as running_peak,
    cumulative_pnl - MAX(cumulative_pnl) OVER (
      PARTITION BY symbol, signal_type
      ORDER BY created_at
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) as drawdown
  FROM running_pnl
)
SELECT
  symbol,
  signal_type,
  COUNT(*) as trades,
  ROUND(MAX(cumulative_pnl)::NUMERIC, 2) as peak_pnl,
  ROUND(MIN(drawdown)::NUMERIC, 2) as max_drawdown,
  ROUND(
    (CASE
      WHEN MAX(running_peak) != 0 THEN (MIN(drawdown) / MAX(running_peak) * 100)
      ELSE 0
    END)::NUMERIC,
    2
  ) as max_drawdown_percent,
  ROUND(AVG(CASE WHEN drawdown < 0 THEN drawdown ELSE NULL END)::NUMERIC, 2) as avg_drawdown
FROM peak_and_drawdown
GROUP BY symbol, signal_type
ORDER BY max_drawdown;

COMMENT ON VIEW pnl_drawdown_analysis IS 'Maximum drawdown analysis per symbol and signal type for risk management';

-- ============================================================================
-- 10. RISK MANAGEMENT FUNCTIONS
-- ============================================================================

-- Function to calculate optimal stop loss based on drawdown history
CREATE OR REPLACE FUNCTION get_optimal_stop_loss(
  p_symbol TEXT,
  p_signal_type TEXT DEFAULT 'ensemble',
  p_confidence_multiplier FLOAT DEFAULT 1.5
)
RETURNS TABLE(
  symbol TEXT,
  signal_type TEXT,
  recommended_stop_loss_pips FLOAT,
  recommended_take_profit_pips FLOAT,
  risk_reward_ratio FLOAT,
  based_on_trades INT,
  max_historical_drawdown FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p_symbol::TEXT,
    p_signal_type::TEXT,
    -- Stop loss: 1.5x del max drawdown medio (per dare margine)
    ROUND((ABS(AVG(CASE WHEN drawdown < 0 THEN drawdown ELSE NULL END)) * p_confidence_multiplier)::NUMERIC, 1)::FLOAT as recommended_stop_loss_pips,
    -- Take profit: 2.5x del stop loss (risk/reward 1:2.5)
    ROUND((ABS(AVG(CASE WHEN drawdown < 0 THEN drawdown ELSE NULL END)) * p_confidence_multiplier * 2.5)::NUMERIC, 1)::FLOAT as recommended_take_profit_pips,
    2.5::FLOAT as risk_reward_ratio,
    COUNT(*)::INT as based_on_trades,
    ROUND(MIN(drawdown)::NUMERIC, 2)::FLOAT as max_historical_drawdown
  FROM (
    SELECT
      cumulative_pnl - MAX(cumulative_pnl) OVER (
        PARTITION BY symbol, signal_type
        ORDER BY created_at
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) as drawdown
    FROM (
      SELECT
        symbol,
        signal_type,
        created_at,
        SUM(actual_result) OVER (
          PARTITION BY symbol, signal_type
          ORDER BY created_at
          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) as cumulative_pnl
      FROM signal_performance
      WHERE symbol = p_symbol
        AND signal_type = p_signal_type
        AND win IS NOT NULL
    ) running_pnl
  ) drawdowns
  WHERE drawdown < 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_optimal_stop_loss IS 'Calculates optimal stop loss and take profit based on historical drawdown analysis';

-- ============================================================================
-- 11. UTILITY FUNCTIONS
-- ============================================================================

-- Function to get dashboard summary
CREATE OR REPLACE FUNCTION get_ensemble_dashboard_summary()
RETURNS TABLE(
  metric TEXT,
  classic_value TEXT,
  ml_value TEXT,
  ensemble_value TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'Win Rate %'::TEXT,
    COALESCE((SELECT win_rate_percent::TEXT FROM ensemble_performance_overview WHERE signal_type = 'classic'), 'N/A'),
    COALESCE((SELECT win_rate_percent::TEXT FROM ensemble_performance_overview WHERE signal_type = 'ml'), 'N/A'),
    COALESCE((SELECT win_rate_percent::TEXT FROM ensemble_performance_overview WHERE signal_type = 'ensemble'), 'N/A')
  UNION ALL
  SELECT
    'Sharpe Ratio'::TEXT,
    COALESCE((SELECT sharpe_ratio::TEXT FROM ensemble_performance_overview WHERE signal_type = 'classic'), 'N/A'),
    COALESCE((SELECT sharpe_ratio::TEXT FROM ensemble_performance_overview WHERE signal_type = 'ml'), 'N/A'),
    COALESCE((SELECT sharpe_ratio::TEXT FROM ensemble_performance_overview WHERE signal_type = 'ensemble'), 'N/A')
  UNION ALL
  SELECT
    'Total P&L'::TEXT,
    COALESCE((SELECT total_pnl::TEXT FROM ensemble_performance_overview WHERE signal_type = 'classic'), 'N/A'),
    COALESCE((SELECT total_pnl::TEXT FROM ensemble_performance_overview WHERE signal_type = 'ml'), 'N/A'),
    COALESCE((SELECT total_pnl::TEXT FROM ensemble_performance_overview WHERE signal_type = 'ensemble'), 'N/A')
  UNION ALL
  SELECT
    'Total Signals'::TEXT,
    COALESCE((SELECT total_signals::TEXT FROM ensemble_performance_overview WHERE signal_type = 'classic'), 'N/A'),
    COALESCE((SELECT total_signals::TEXT FROM ensemble_performance_overview WHERE signal_type = 'ml'), 'N/A'),
    COALESCE((SELECT total_signals::TEXT FROM ensemble_performance_overview WHERE signal_type = 'ensemble'), 'N/A');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_ensemble_dashboard_summary IS 'Quick dashboard summary comparing all signal types';

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Allow authenticated users to read dashboard views
GRANT SELECT ON ensemble_performance_overview TO authenticated, anon;
GRANT SELECT ON symbol_performance_detail TO authenticated, anon;
GRANT SELECT ON context_performance_matrix TO authenticated, anon;
GRANT SELECT ON ensemble_weights_status TO authenticated, anon;
GRANT SELECT ON confidence_calibration TO authenticated, anon;
GRANT SELECT ON recent_signals_detail TO authenticated, anon;
GRANT SELECT ON ml_validation_effectiveness TO authenticated, anon;
GRANT SELECT ON temporal_performance TO authenticated, anon;
GRANT SELECT ON pnl_drawdown_analysis TO authenticated, anon;

GRANT EXECUTE ON FUNCTION get_ensemble_dashboard_summary TO authenticated, anon;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

/*

-- Quick Summary
SELECT * FROM get_ensemble_dashboard_summary();

-- Overall Performance
SELECT * FROM ensemble_performance_overview;

-- Best Performing Symbols
SELECT * FROM symbol_performance_detail
WHERE win_rate > 55
ORDER BY total_pnl DESC;

-- Context Analysis: Which contexts work best?
SELECT * FROM context_performance_matrix
WHERE win_rate > 60
ORDER BY trades DESC;

-- Current Weights
SELECT * FROM ensemble_weights_status
ORDER BY sample_size DESC;

-- Confidence Calibration Check
SELECT * FROM confidence_calibration
WHERE ABS(avg_confidence - actual_win_rate) > 10;  -- Miscalibrated

-- Recent Activity
SELECT
  symbol,
  signal_type,
  predicted_direction,
  confidence,
  win,
  actual_result,
  created_at
FROM recent_signals_detail;

-- ML Validation Impact
SELECT * FROM ml_validation_effectiveness
ORDER BY win_rate DESC;

-- Best Trading Hours
SELECT * FROM temporal_performance
WHERE win_rate > 55
ORDER BY signals DESC;

-- Drawdown Analysis
SELECT * FROM pnl_drawdown_analysis
WHERE max_drawdown_percent < -10;  -- Significant drawdowns

*/
