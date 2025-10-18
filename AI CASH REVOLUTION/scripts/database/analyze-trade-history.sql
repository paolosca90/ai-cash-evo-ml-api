-- ANALISI TRADE STORICI
-- Query per analizzare i segnali generati finora e capire cosa funziona

-- 1. OVERVIEW GENERALE
SELECT 
  COUNT(*) as total_signals,
  COUNT(DISTINCT symbol) as unique_pairs,
  COUNT(DISTINCT client_id) as unique_users,
  MIN(timestamp) as first_signal,
  MAX(timestamp) as last_signal,
  DATE_PART('day', MAX(timestamp) - MIN(timestamp)) as days_of_data
FROM mt5_signals;

-- 2. DISTRIBUZIONE SEGNALI PER SYMBOL
SELECT 
  symbol,
  COUNT(*) as signal_count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM mt5_signals
GROUP BY symbol
ORDER BY signal_count DESC;

-- 3. DISTRIBUZIONE BUY vs SELL
SELECT 
  type,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage,
  ROUND(AVG(confidence), 2) as avg_confidence,
  ROUND(AVG(tp), 4) as avg_tp,
  ROUND(AVG(sl), 4) as avg_sl
FROM mt5_signals
GROUP BY type;

-- 4. SEGNALI PER TIMEFRAME (se il campo esiste)
SELECT 
  timeframe,
  COUNT(*) as signal_count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM mt5_signals
WHERE timeframe IS NOT NULL
GROUP BY timeframe
ORDER BY signal_count DESC;

-- 5. DISTRIBUZIONE CONFIDENCE
SELECT 
  CASE 
    WHEN confidence >= 90 THEN '90-100% (Very High)'
    WHEN confidence >= 80 THEN '80-89% (High)'
    WHEN confidence >= 70 THEN '70-79% (Good)'
    WHEN confidence >= 60 THEN '60-69% (Medium)'
    WHEN confidence >= 50 THEN '50-59% (Low)'
    ELSE '0-49% (Very Low)'
  END as confidence_range,
  COUNT(*) as signal_count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM mt5_signals
GROUP BY 
  CASE 
    WHEN confidence >= 90 THEN '90-100% (Very High)'
    WHEN confidence >= 80 THEN '80-89% (High)'
    WHEN confidence >= 70 THEN '70-79% (Good)'
    WHEN confidence >= 60 THEN '60-69% (Medium)'
    WHEN confidence >= 50 THEN '50-59% (Low)'
    ELSE '0-49% (Very Low)'
  END
ORDER BY signal_count DESC;

-- 6. ANALISI WIN RATE (dalla tabella signal_performance se esiste)
SELECT 
  s.symbol,
  s.type,
  COUNT(p.id) as trades_closed,
  SUM(CASE WHEN p.outcome = 'WIN' THEN 1 ELSE 0 END) as wins,
  SUM(CASE WHEN p.outcome = 'LOSS' THEN 1 ELSE 0 END) as losses,
  ROUND(
    SUM(CASE WHEN p.outcome = 'WIN' THEN 1 ELSE 0 END) * 100.0 / 
    NULLIF(COUNT(p.id), 0), 
    2
  ) as win_rate,
  ROUND(AVG(p.pips), 2) as avg_pips,
  ROUND(SUM(p.pips), 2) as total_pips
FROM mt5_signals s
LEFT JOIN signal_performance p ON s.id = p.signal_id
WHERE p.id IS NOT NULL
GROUP BY s.symbol, s.type
ORDER BY win_rate DESC NULLS LAST;

-- 7. WIN RATE PER CONFIDENCE RANGE
SELECT 
  CASE 
    WHEN s.confidence >= 90 THEN '90-100%'
    WHEN s.confidence >= 80 THEN '80-89%'
    WHEN s.confidence >= 70 THEN '70-79%'
    WHEN s.confidence >= 60 THEN '60-69%'
    WHEN s.confidence >= 50 THEN '50-59%'
    ELSE '0-49%'
  END as confidence_range,
  COUNT(p.id) as trades_closed,
  SUM(CASE WHEN p.outcome = 'WIN' THEN 1 ELSE 0 END) as wins,
  ROUND(
    SUM(CASE WHEN p.outcome = 'WIN' THEN 1 ELSE 0 END) * 100.0 / 
    NULLIF(COUNT(p.id), 0), 
    2
  ) as win_rate,
  ROUND(AVG(p.pips), 2) as avg_pips
FROM mt5_signals s
LEFT JOIN signal_performance p ON s.id = p.signal_id
WHERE p.id IS NOT NULL
GROUP BY 
  CASE 
    WHEN s.confidence >= 90 THEN '90-100%'
    WHEN s.confidence >= 80 THEN '80-89%'
    WHEN s.confidence >= 70 THEN '70-79%'
    WHEN s.confidence >= 60 THEN '60-69%'
    WHEN s.confidence >= 50 THEN '50-59%'
    ELSE '0-49%'
  END
ORDER BY confidence_range DESC;

-- 8. PERFORMANCE PER ORA DEL GIORNO
SELECT 
  EXTRACT(HOUR FROM s.timestamp) as hour_utc,
  COUNT(p.id) as trades,
  SUM(CASE WHEN p.outcome = 'WIN' THEN 1 ELSE 0 END) as wins,
  ROUND(
    SUM(CASE WHEN p.outcome = 'WIN' THEN 1 ELSE 0 END) * 100.0 / 
    NULLIF(COUNT(p.id), 0), 
    2
  ) as win_rate,
  ROUND(AVG(p.pips), 2) as avg_pips
FROM mt5_signals s
LEFT JOIN signal_performance p ON s.id = p.signal_id
WHERE p.id IS NOT NULL
GROUP BY EXTRACT(HOUR FROM s.timestamp)
ORDER BY hour_utc;

-- 9. BEST PERFORMING PATTERNS
-- Combinazioni symbol + type + confidence range
SELECT 
  s.symbol,
  s.type,
  CASE 
    WHEN s.confidence >= 70 THEN 'High (70+)'
    WHEN s.confidence >= 50 THEN 'Medium (50-69)'
    ELSE 'Low (<50)'
  END as confidence_level,
  COUNT(p.id) as trades,
  SUM(CASE WHEN p.outcome = 'WIN' THEN 1 ELSE 0 END) as wins,
  ROUND(
    SUM(CASE WHEN p.outcome = 'WIN' THEN 1 ELSE 0 END) * 100.0 / 
    NULLIF(COUNT(p.id), 0), 
    2
  ) as win_rate,
  ROUND(SUM(p.pips), 2) as total_pips,
  ROUND(AVG(p.pips), 2) as avg_pips
FROM mt5_signals s
LEFT JOIN signal_performance p ON s.id = p.signal_id
WHERE p.id IS NOT NULL
GROUP BY s.symbol, s.type, 
  CASE 
    WHEN s.confidence >= 70 THEN 'High (70+)'
    WHEN s.confidence >= 50 THEN 'Medium (50-69)'
    ELSE 'Low (<50)'
  END
HAVING COUNT(p.id) >= 5  -- Almeno 5 trade per pattern
ORDER BY win_rate DESC, total_pips DESC;

-- 10. WORST PERFORMING PATTERNS
SELECT 
  s.symbol,
  s.type,
  COUNT(p.id) as trades,
  SUM(CASE WHEN p.outcome = 'WIN' THEN 1 ELSE 0 END) as wins,
  ROUND(
    SUM(CASE WHEN p.outcome = 'WIN' THEN 1 ELSE 0 END) * 100.0 / 
    NULLIF(COUNT(p.id), 0), 
    2
  ) as win_rate,
  ROUND(SUM(p.pips), 2) as total_pips
FROM mt5_signals s
LEFT JOIN signal_performance p ON s.id = p.signal_id
WHERE p.id IS NOT NULL
GROUP BY s.symbol, s.type
HAVING COUNT(p.id) >= 5
ORDER BY win_rate ASC, total_pips ASC
LIMIT 10;

-- 11. RECENT SIGNALS (ultimi 7 giorni)
SELECT 
  s.timestamp,
  s.symbol,
  s.type,
  s.entry,
  s.tp,
  s.sl,
  s.confidence,
  p.outcome,
  p.pips,
  p.closed_at
FROM mt5_signals s
LEFT JOIN signal_performance p ON s.id = p.signal_id
WHERE s.timestamp >= NOW() - INTERVAL '7 days'
ORDER BY s.timestamp DESC
LIMIT 50;

-- 12. SUMMARY STATISTICS
SELECT 
  'Total Signals' as metric,
  COUNT(*)::text as value
FROM mt5_signals
UNION ALL
SELECT 
  'Signals with Performance Data',
  COUNT(DISTINCT s.id)::text
FROM mt5_signals s
INNER JOIN signal_performance p ON s.id = p.signal_id
UNION ALL
SELECT 
  'Overall Win Rate',
  ROUND(
    SUM(CASE WHEN outcome = 'WIN' THEN 1 ELSE 0 END) * 100.0 / 
    NULLIF(COUNT(*), 0), 
    2
  )::text || '%'
FROM signal_performance
UNION ALL
SELECT 
  'Total Pips',
  ROUND(SUM(pips), 2)::text
FROM signal_performance
UNION ALL
SELECT 
  'Avg Pips per Trade',
  ROUND(AVG(pips), 2)::text
FROM signal_performance
UNION ALL
SELECT 
  'Best Trade',
  ROUND(MAX(pips), 2)::text || ' pips'
FROM signal_performance
UNION ALL
SELECT 
  'Worst Trade',
  ROUND(MIN(pips), 2)::text || ' pips'
FROM signal_performance;
