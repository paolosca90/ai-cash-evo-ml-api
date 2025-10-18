-- ML Labeling Function
-- Labels candles with BUY/SELL predictions using backtest simulation
-- Runs server-side for maximum performance

-- Helper function: Calculate pips from price difference
CREATE OR REPLACE FUNCTION calculate_pips(price_diff DECIMAL, symbol VARCHAR)
RETURNS DECIMAL AS $$
BEGIN
  RETURN CASE 
    WHEN symbol IN ('EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDCAD') THEN price_diff * 10000
    WHEN symbol = 'USDJPY' THEN price_diff * 100
    WHEN symbol = 'XAUUSD' THEN price_diff * 10
    ELSE price_diff * 10000
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function: Simulate trade
CREATE OR REPLACE FUNCTION simulate_trade(
  candles JSONB[],
  entry_idx INT,
  direction VARCHAR,
  symbol VARCHAR,
  sl_pips DECIMAL DEFAULT 20,
  tp_pips DECIMAL DEFAULT 40
)
RETURNS JSONB AS $$
DECLARE
  entry_candle JSONB;
  entry_price DECIMAL;
  sl_price DECIMAL;
  tp_price DECIMAL;
  pip_multiplier DECIMAL;
  current_candle JSONB;
  i INT;
  pips DECIMAL;
  final_price DECIMAL;
BEGIN
  -- Get entry candle
  IF entry_idx >= array_length(candles, 1) THEN
    RETURN jsonb_build_object('outcome', 'INVALID', 'pips', 0, 'duration', 0);
  END IF;
  
  entry_candle := candles[entry_idx + 1]; -- PostgreSQL arrays are 1-indexed
  entry_price := (entry_candle->>'close')::DECIMAL;
  
  -- Calculate pip multiplier
  pip_multiplier := CASE 
    WHEN symbol IN ('EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDCAD') THEN 10000
    WHEN symbol = 'USDJPY' THEN 100
    WHEN symbol = 'XAUUSD' THEN 10
    ELSE 10000
  END;
  
  -- Calculate SL/TP prices
  IF direction = 'BUY' THEN
    sl_price := entry_price - (sl_pips / pip_multiplier);
    tp_price := entry_price + (tp_pips / pip_multiplier);
  ELSE -- SELL
    sl_price := entry_price + (sl_pips / pip_multiplier);
    tp_price := entry_price - (tp_pips / pip_multiplier);
  END IF;
  
  -- Check subsequent candles for hit (max 100 candles)
  FOR i IN (entry_idx + 2) .. LEAST(entry_idx + 101, array_length(candles, 1)) LOOP
    current_candle := candles[i];
    
    IF direction = 'BUY' THEN
      -- Check SL hit
      IF (current_candle->>'low')::DECIMAL <= sl_price THEN
        pips := calculate_pips(sl_price - entry_price, symbol);
        RETURN jsonb_build_object(
          'outcome', 'LOSS',
          'pips', ABS(pips),
          'duration', i - entry_idx - 1
        );
      END IF;
      
      -- Check TP hit
      IF (current_candle->>'high')::DECIMAL >= tp_price THEN
        pips := calculate_pips(tp_price - entry_price, symbol);
        RETURN jsonb_build_object(
          'outcome', 'WIN',
          'pips', pips,
          'duration', i - entry_idx - 1
        );
      END IF;
    ELSE -- SELL
      -- Check SL hit
      IF (current_candle->>'high')::DECIMAL >= sl_price THEN
        pips := calculate_pips(entry_price - sl_price, symbol);
        RETURN jsonb_build_object(
          'outcome', 'LOSS',
          'pips', ABS(pips),
          'duration', i - entry_idx - 1
        );
      END IF;
      
      -- Check TP hit
      IF (current_candle->>'low')::DECIMAL <= tp_price THEN
        pips := calculate_pips(entry_price - tp_price, symbol);
        RETURN jsonb_build_object(
          'outcome', 'WIN',
          'pips', pips,
          'duration', i - entry_idx - 1
        );
      END IF;
    END IF;
  END LOOP;
  
  -- No hit - calculate current P/L
  current_candle := candles[LEAST(entry_idx + 100, array_length(candles, 1))];
  final_price := (current_candle->>'close')::DECIMAL;
  
  IF direction = 'BUY' THEN
    pips := calculate_pips(final_price - entry_price, symbol);
  ELSE
    pips := calculate_pips(entry_price - final_price, symbol);
  END IF;
  
  RETURN jsonb_build_object(
    'outcome', CASE WHEN pips > 0 THEN 'WIN' WHEN pips < 0 THEN 'LOSS' ELSE 'BREAKEVEN' END,
    'pips', ABS(pips),
    'duration', 99
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Helper function: Calculate technical score
CREATE OR REPLACE FUNCTION calculate_technical_score(
  rsi DECIMAL,
  ema12 DECIMAL,
  ema21 DECIMAL,
  adx DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  score DECIMAL := 50.0;
BEGIN
  -- RSI contribution (±15 points)
  IF rsi IS NOT NULL THEN
    IF rsi < 30 THEN score := score + 15;
    ELSIF rsi > 70 THEN score := score - 15;
    ELSIF rsi < 40 THEN score := score + 7;
    ELSIF rsi > 60 THEN score := score - 7;
    END IF;
  END IF;
  
  -- EMA contribution (±10 points)
  IF ema12 IS NOT NULL AND ema21 IS NOT NULL THEN
    IF ema12 > ema21 THEN score := score + 10;
    ELSE score := score - 10;
    END IF;
  END IF;
  
  -- ADX contribution (±5 points)
  IF adx IS NOT NULL AND adx > 25 THEN
    score := score + 5;
  END IF;
  
  RETURN GREATEST(0, LEAST(100, score));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Main labeling function
CREATE OR REPLACE FUNCTION label_candles_batch(
  p_symbol VARCHAR,
  p_granularity VARCHAR,
  p_dataset_type VARCHAR,
  p_batch_size INT DEFAULT 100
)
RETURNS TABLE(labeled_count INT, buy_count INT, sell_count INT) AS $$
DECLARE
  candles_array JSONB[];
  unlabeled_candles RECORD;
  buy_result JSONB;
  sell_result JSONB;
  buy_score DECIMAL;
  sell_score DECIMAL;
  label_text VARCHAR;
  winner JSONB;
  loser JSONB;
  pip_advantage DECIMAL;
  pip_component DECIMAL;
  outcome_component DECIMAL;
  winner_component DECIMAL;
  tech_component DECIMAL;
  tech_score DECIMAL;
  confidence DECIMAL;
  quality DECIMAL;
  total_labeled INT := 0;
  total_buy INT := 0;
  total_sell INT := 0;
  candle_idx INT;
BEGIN
  -- Load all candles for this symbol/granularity into array
  SELECT array_agg(
    jsonb_build_object(
      'id', id,
      'open', open,
      'high', high,
      'low', low,
      'close', close,
      'rsi', rsi,
      'ema12', ema12,
      'ema21', ema21,
      'adx', adx,
      'is_labeled', is_labeled
    ) ORDER BY timestamp ASC
  ) INTO candles_array
  FROM ml_historical_candles
  WHERE symbol = p_symbol
    AND granularity = p_granularity
    AND dataset_type = p_dataset_type;
  
  -- Process each unlabeled candle
  FOR candle_idx IN 1 .. array_length(candles_array, 1) LOOP
    IF (candles_array[candle_idx]->>'is_labeled')::BOOLEAN = false THEN
      -- Simulate BUY trade
      buy_result := simulate_trade(candles_array, candle_idx - 1, 'BUY', p_symbol, 20, 40);
      
      -- Simulate SELL trade
      sell_result := simulate_trade(candles_array, candle_idx - 1, 'SELL', p_symbol, 20, 40);
      
      -- Determine winner
      buy_score := CASE 
        WHEN buy_result->>'outcome' = 'WIN' THEN (buy_result->>'pips')::DECIMAL
        ELSE -(buy_result->>'pips')::DECIMAL
      END;
      
      sell_score := CASE 
        WHEN sell_result->>'outcome' = 'WIN' THEN (sell_result->>'pips')::DECIMAL
        ELSE -(sell_result->>'pips')::DECIMAL
      END;
      
      -- Choose direction
      IF buy_score > sell_score THEN
        label_text := 'BUY';
        winner := buy_result;
        loser := sell_result;
        pip_advantage := buy_score - sell_score;
      ELSIF sell_score > buy_score THEN
        label_text := 'SELL';
        winner := sell_result;
        loser := buy_result;
        pip_advantage := sell_score - buy_score;
      ELSE
        -- Tie - use technical as tiebreaker
        tech_score := calculate_technical_score(
          (candles_array[candle_idx]->>'rsi')::DECIMAL,
          (candles_array[candle_idx]->>'ema12')::DECIMAL,
          (candles_array[candle_idx]->>'ema21')::DECIMAL,
          (candles_array[candle_idx]->>'adx')::DECIMAL
        );
        label_text := CASE WHEN tech_score >= 50 THEN 'BUY' ELSE 'SELL' END;
        winner := CASE WHEN tech_score >= 50 THEN buy_result ELSE sell_result END;
        loser := CASE WHEN tech_score >= 50 THEN sell_result ELSE buy_result END;
        pip_advantage := 0;
      END IF;
      
      -- Calculate confidence
      -- 1. Pip advantage (0-30)
      pip_component := LEAST(30, (pip_advantage / 40) * 30);
      
      -- 2. Outcome (0-35)
      outcome_component := CASE
        WHEN winner->>'outcome' = 'WIN' AND loser->>'outcome' = 'LOSS' THEN 35
        WHEN winner->>'outcome' = 'WIN' THEN 25
        WHEN winner->>'outcome' = 'LOSS' AND loser->>'outcome' = 'LOSS' THEN 10
        ELSE 15
      END;
      
      -- 3. Winner quality (0-20)
      winner_component := CASE
        WHEN winner->>'outcome' = 'WIN' THEN LEAST(20, ((winner->>'pips')::DECIMAL / 40) * 20)
        ELSE 0
      END;
      
      -- 4. Technical score (0-15)
      tech_score := calculate_technical_score(
        (candles_array[candle_idx]->>'rsi')::DECIMAL,
        (candles_array[candle_idx]->>'ema12')::DECIMAL,
        (candles_array[candle_idx]->>'ema21')::DECIMAL,
        (candles_array[candle_idx]->>'adx')::DECIMAL
      );
      tech_component := CASE
        WHEN label_text = 'BUY' THEN (tech_score / 100) * 15
        ELSE ((100 - tech_score) / 100) * 15
      END;
      
      confidence := pip_component + outcome_component + winner_component + tech_component;
      confidence := GREATEST(0, LEAST(100, confidence));
      quality := confidence;
      
      -- Update candle
      UPDATE ml_historical_candles
      SET
        label = label_text,
        label_confidence = ROUND(confidence::NUMERIC, 2),
        trade_outcome = winner->>'outcome',
        win_pips = ROUND((winner->>'pips')::NUMERIC, 2),
        loss_pips = ROUND((loser->>'pips')::NUMERIC, 2),
        trade_duration_minutes = (winner->>'duration')::INT,
        label_quality = ROUND(quality::NUMERIC, 2),
        is_labeled = true
      WHERE id = (candles_array[candle_idx]->>'id')::UUID;
      
      total_labeled := total_labeled + 1;
      IF label_text = 'BUY' THEN
        total_buy := total_buy + 1;
      ELSE
        total_sell := total_sell + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT total_labeled, total_buy, total_sell;
END;
$$ LANGUAGE plpgsql;

-- Function to label all candles for a dataset
CREATE OR REPLACE FUNCTION label_all_candles(p_dataset_type VARCHAR DEFAULT 'training')
RETURNS TABLE(
  symbol VARCHAR,
  granularity VARCHAR,
  labeled INT,
  buy_signals INT,
  sell_signals INT
) AS $$
DECLARE
  combo RECORD;
  result RECORD;
BEGIN
  -- Get all symbol/granularity combinations
  FOR combo IN 
    SELECT DISTINCT c.symbol, c.granularity
    FROM ml_historical_candles c
    WHERE c.dataset_type = p_dataset_type
      AND c.is_labeled = false
    ORDER BY c.symbol, c.granularity
  LOOP
    -- Label this combination
    SELECT * INTO result
    FROM label_candles_batch(combo.symbol, combo.granularity, p_dataset_type, 100);
    
    RETURN QUERY SELECT 
      combo.symbol,
      combo.granularity,
      result.labeled_count,
      result.buy_count,
      result.sell_count;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_pips TO service_role;
GRANT EXECUTE ON FUNCTION simulate_trade TO service_role;
GRANT EXECUTE ON FUNCTION calculate_technical_score TO service_role;
GRANT EXECUTE ON FUNCTION label_candles_batch TO service_role;
GRANT EXECUTE ON FUNCTION label_all_candles TO service_role;

COMMENT ON FUNCTION label_candles_batch IS 'Labels a batch of candles for ML training using backtest simulation';
COMMENT ON FUNCTION label_all_candles IS 'Labels all unlabeled candles in a dataset';
