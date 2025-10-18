-- Migration CRITICA per tick-by-tick optimization
-- QUESTA MANCA NEL DATABASE ATTUALE!

-- 1. Estensioni necessarie per tick-by-tick
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- 2. Tabella parametri ottimizzati (ESSENZIALE per auto-optimization)
CREATE TABLE IF NOT EXISTS optimized_parameters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol TEXT NOT NULL,
    parameter_name TEXT NOT NULL,
    parameter_value JSONB NOT NULL,
    confidence_score FLOAT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    sample_size INTEGER DEFAULT 0,
    performance_metrics JSONB DEFAULT '{}'
);

-- 3. Tabella pattern recognition (ESSENZIALE per ML)
CREATE TABLE IF NOT EXISTS trading_patterns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    symbol TEXT NOT NULL,
    pattern_type TEXT NOT NULL,
    pattern_data JSONB NOT NULL,
    win_rate FLOAT DEFAULT 0,
    sample_size INTEGER DEFAULT 0,
    confidence_score FLOAT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Tabella performance ML models
CREATE TABLE IF NOT EXISTS ml_model_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    accuracy FLOAT DEFAULT 0,
    precision FLOAT DEFAULT 0,
    recall FLOAT DEFAULT 0,
    f1_score FLOAT DEFAULT 0,
    last_trained TIMESTAMP WITH TIME ZONE DEFAULT now(),
    feature_importance JSONB DEFAULT '{}',
    performance_trend TEXT DEFAULT 'stable'
);

-- 5. Miglioramenti tabella mt5_signals per tick-by-tick
ALTER TABLE public.mt5_signals
ADD COLUMN IF NOT EXISTS ml_confidence_score FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS optimized_parameters JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS pattern_detected TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS execution_latency_ms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS batch_update_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_tick_timestamp TIMESTAMP WITH TIME ZONE;

-- 6. Indici per performance tick-by-tick
CREATE INDEX IF NOT EXISTS idx_optimized_parameters_symbol ON optimized_parameters(symbol, parameter_name);
CREATE INDEX IF NOT EXISTS idx_trading_patterns_symbol_type ON trading_patterns(symbol, pattern_type, is_active);
CREATE INDEX IF NOT EXISTS idx_ml_model_performance_symbol ON ml_model_performance(symbol, model_name);
CREATE INDEX IF NOT EXISTS idx_mt5_signals_tick_timestamp ON mt5_signals(last_tick_timestamp);

-- 7. Funzione per auto-ottimizzazione ogni 6 ore
CREATE OR REPLACE FUNCTION trigger_auto_optimization()
RETURNS void AS $$
BEGIN
    PERFORM pg_cron.schedule(
        'auto-optimization-6h',
        '0 */6 * * *',
        $$SELECT net.http_post(
            url:='https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/trading-auto-optimizer',
            headers:='{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}',
            body:='{"action": "scheduled_optimization"}'
        )$$
    );
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger per ottimizzazione dopo trade chiusi
CREATE OR REPLACE FUNCTION optimize_after_trade()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'closed' AND ABS(NEW.actual_profit) > 10 THEN
        PERFORM pg_notify('trade_optimization', json_build_object(
            'signal_id', NEW.id,
            'symbol', NEW.symbol,
            'profit', NEW.actual_profit,
            'timestamp', now()
        )::text);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Abilita trigger su mt5_signals
DROP TRIGGER IF EXISTS optimize_trade_trigger ON mt5_signals;
CREATE TRIGGER optimize_trade_trigger
AFTER UPDATE ON mt5_signals
FOR EACH ROW
WHEN (NEW.status = 'closed' AND OLD.status != 'closed')
EXECUTE FUNCTION optimize_after_trade();

-- 10. Vista per monitoraggio tick-by-tick in tempo reale
CREATE OR REPLACE VIEW tick_by_tick_monitoring AS
SELECT
    s.id,
    s.symbol,
    s.signal,
    s.status,
    s.current_profit,
    s.current_pips,
    s.last_tick_timestamp,
    s.ml_confidence_score,
    s.pattern_detected,
    s.batch_update_count,
    CASE
        WHEN s.status = 'opened' AND s.last_tick_timestamp > now() - interval '1 minute' THEN '✅ Active'
        WHEN s.status = 'opened' AND s.last_tick_timestamp > now() - interval '5 minutes' THEN '⚠️ Delayed'
        WHEN s.status = 'opened' THEN '❌ Stale'
        ELSE s.status
    END as health_status,
    EXTRACT(EPOCH FROM (now() - s.last_tick_timestamp)) as seconds_since_last_tick
FROM mt5_signals s
WHERE s.status IN ('opened', 'pending')
ORDER BY s.last_tick_timestamp DESC;

-- 11. Log della migrazione
INSERT INTO public.schema_versions (version, description, migration_date)
VALUES (
    '2.2.0',
    'Added complete tick-by-tick optimization system with ML auto-optimization, pattern recognition, and real-time monitoring',
    now()
);

-- 12. Grant permissions
GRANT SELECT ON tick_by_tick_monitoring TO authenticated;
GRANT SELECT ON optimized_parameters TO authenticated;
GRANT SELECT ON trading_patterns TO authenticated;
GRANT SELECT ON ml_model_performance TO authenticated;