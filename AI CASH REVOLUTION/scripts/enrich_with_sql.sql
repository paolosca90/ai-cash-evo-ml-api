-- ULTRA-FAST ENRICHMENT VIA SQL
-- Calculates weights directly in database (much faster than Python loops)
-- Run this in Supabase SQL Editor

-- Step 1: Create temporary function to calculate weights
CREATE OR REPLACE FUNCTION calculate_signal_weight(
    p_label_confidence DECIMAL,
    p_rsi DECIMAL,
    p_adx DECIMAL
) RETURNS TABLE (
    weight DECIMAL,
    recommendation VARCHAR,
    multiplier DECIMAL
) AS $$
DECLARE
    v_ml_score DECIMAL;
    v_tech_score DECIMAL;
    v_total_weight DECIMAL;
    v_recommendation VARCHAR;
    v_multiplier DECIMAL;
BEGIN
    -- ML Confidence component (30%)
    v_ml_score := COALESCE(p_label_confidence, 50);

    -- Technical Quality component (25%) - simplified
    -- Based on RSI and ADX
    v_tech_score := 50; -- Default

    IF p_rsi IS NOT NULL THEN
        -- RSI scoring: extreme values are better
        IF p_rsi < 30 OR p_rsi > 70 THEN
            v_tech_score := 80;
        ELSIF p_rsi < 40 OR p_rsi > 60 THEN
            v_tech_score := 65;
        ELSE
            v_tech_score := 45;
        END IF;
    END IF;

    -- ADX bonus
    IF p_adx IS NOT NULL AND p_adx > 25 THEN
        v_tech_score := v_tech_score + 15;
    END IF;

    v_tech_score := LEAST(v_tech_score, 100);

    -- Total weight (simplified: 50% ML, 50% technical)
    v_total_weight := (v_ml_score * 0.5) + (v_tech_score * 0.5);

    -- Determine recommendation
    IF v_total_weight >= 75 THEN
        v_recommendation := 'STRONG_BUY';
        v_multiplier := 1.5;
    ELSIF v_total_weight >= 60 THEN
        v_recommendation := 'BUY';
        v_multiplier := 1.0;
    ELSIF v_total_weight >= 40 THEN
        v_recommendation := 'WEAK';
        v_multiplier := 0.5;
    ELSE
        v_recommendation := 'AVOID';
        v_multiplier := 0.25;
    END IF;

    RETURN QUERY SELECT v_total_weight, v_recommendation, v_multiplier;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Update all signals in one go (FAST!)
WITH weight_calculations AS (
    SELECT
        id,
        (calculate_signal_weight(label_confidence, rsi, adx)).*
    FROM ml_historical_candles
    WHERE is_labeled = TRUE
      AND signal_weight IS NULL
)
UPDATE ml_historical_candles m
SET
    signal_weight = w.weight,
    signal_recommendation = w.recommendation,
    position_multiplier = w.multiplier
FROM weight_calculations w
WHERE m.id = w.id;

-- Step 3: Verify results
SELECT
    signal_recommendation,
    COUNT(*) as count,
    ROUND(AVG(signal_weight), 2) as avg_weight,
    ROUND(MIN(signal_weight), 2) as min_weight,
    ROUND(MAX(signal_weight), 2) as max_weight
FROM ml_historical_candles
WHERE signal_weight IS NOT NULL
GROUP BY signal_recommendation
ORDER BY avg_weight DESC;
