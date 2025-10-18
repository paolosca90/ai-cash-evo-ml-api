-- Migrazione completa per il sistema di Trade Verification
-- Questa migra aggiunge tutti i campi necessari per il tracking completo dei trade

-- Aggiungi campi per tracking profit/loss in tempo reale
ALTER TABLE public.mt5_signals
ADD COLUMN IF NOT EXISTS current_profit DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_pips DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_update TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS max_duration_minutes INTEGER DEFAULT 480,
ADD COLUMN IF NOT EXISTS monitoring_status TEXT DEFAULT 'active' CHECK (monitoring_status IN ('active', 'paused', 'timeout', 'error')),
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP WITH TIME ZONE;

-- Aggiungi indici per performance query
CREATE INDEX IF NOT EXISTS idx_mt5_signals_status_symbol
ON public.mt5_signals (status, symbol);

CREATE INDEX IF NOT EXISTS idx_mt5_signals_client_status
ON public.mt5_signals (client_id, status);

CREATE INDEX IF NOT EXISTS idx_mt5_signals_last_update
ON public.mt5_signals (last_update);

CREATE INDEX IF NOT EXISTS idx_mt5_signals_monitoring
ON public.mt5_signals (monitoring_status, symbol);

-- Aggiorna trigger esistente per gestire nuovi campi
CREATE OR REPLACE FUNCTION public.update_trading_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo quando un trade viene chiuso
    IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
        -- Calcola durata trade
        DECLARE trade_duration INTEGER DEFAULT 0;
        IF NEW.opened_at IS NOT NULL AND NEW.closed_at IS NOT NULL THEN
            trade_duration = EXTRACT(EPOCH FROM (NEW.closed_at - NEW.opened_at)) / 60;
        END IF;

        -- Aggiorna o inserisci analytics per questo simbolo
        INSERT INTO public.trading_analytics (
            symbol,
            symbol_total_trades,
            symbol_win_rate,
            symbol_avg_profit,
            profitable_patterns
        )
        VALUES (
            NEW.symbol,
            1,
            CASE WHEN NEW.actual_profit > 0 THEN 100.0 ELSE 0.0 END,
            COALESCE(NEW.actual_profit, 0),
            jsonb_build_object(
                'last_trade_profit', NEW.actual_profit,
                'last_trade_pips', NEW.pips_gained,
                'last_trade_duration', trade_duration,
                'last_close_reason', NEW.close_reason,
                'last_update', now()
            )
        )
        ON CONFLICT (symbol)
        DO UPDATE SET
            symbol_total_trades = trading_analytics.symbol_total_trades + 1,
            symbol_win_rate = (
                SELECT (COUNT(*) FILTER (WHERE actual_profit > 0) * 100.0 / COUNT(*))
                FROM public.mt5_signals
                WHERE symbol = NEW.symbol AND status = 'closed'
            ),
            symbol_avg_profit = (
                SELECT AVG(actual_profit)
                FROM public.mt5_signals
                WHERE symbol = NEW.symbol AND status = 'closed'
            ),
            profitable_patterns = jsonb_set(
                trading_analytics.profitable_patterns,
                '{last_trade_profit}',
                to_jsonb(COALESCE(NEW.actual_profit, 0))
            ),
            profitable_patterns = jsonb_set(
                trading_analytics.profitable_patterns,
                '{last_trade_pips}',
                to_jsonb(COALESCE(NEW.pips_gained, 0))
            ),
            profitable_patterns = jsonb_set(
                trading_analytics.profitable_patterns,
                '{last_trade_duration}',
                to_jsonb(trade_duration)
            ),
            profitable_patterns = jsonb_set(
                trading_analytics.profitable_patterns,
                '{last_close_reason}',
                to_jsonb(COALESCE(NEW.close_reason, 'unknown'))
            ),
            updated_at = now();

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aggiungi funzione per heartbeat dei trade attivi
CREATE OR REPLACE FUNCTION public.update_trade_heartbeat()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER DEFAULT 0;
BEGIN
    -- Aggiorna heartbeat per tutti i trade attivi
    UPDATE public.mt5_signals
    SET last_heartbeat = now(),
        monitoring_status = CASE
            WHEN now() - last_heartbeat > '10 minutes'::interval THEN 'error'
            ELSE monitoring_status
        END
    WHERE status = 'opened'
    AND monitoring_status = 'active';

    GET DIAGNOSTICS updated_count = ROW_COUNT;

    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aggiungi funzione per verificare trade timeout
CREATE OR REPLACE FUNCTION public.check_trade_timeouts()
RETURNS TABLE (
    signal_id UUID,
    symbol TEXT,
    duration_minutes INTEGER,
    max_duration INTEGER,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id,
        s.symbol,
        EXTRACT(EPOCH FROM (now() - s.opened_at)) / 60 as duration_minutes,
        COALESCE(s.max_duration_minutes, 480) as max_duration,
        CASE
            WHEN EXTRACT(EPOCH FROM (now() - s.opened_at)) / 60 > COALESCE(s.max_duration_minutes, 480)
            THEN 'timeout'
            ELSE 'active'
        END as status
    FROM public.mt5_signals s
    WHERE s.status = 'opened'
    AND s.monitoring_status = 'active'
    AND EXTRACT(EPOCH FROM (now() - s.opened_at)) / 60 > COALESCE(s.max_duration_minutes, 480) * 0.9; -- 90% del max per preavviso
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Aggiungi vista per monitoraggio trade attivi
CREATE OR REPLACE VIEW public.active_trades_monitoring AS
SELECT
    s.id,
    s.symbol,
    s.signal,
    s.entry,
    s.stop_loss,
    s.take_profit,
    s.confidence,
    s.client_id,
    s.status,
    s.opened_at,
    s.last_update,
    s.last_heartbeat,
    s.current_profit,
    s.current_pips,
    s.max_duration_minutes,
    s.monitoring_status,
    s.retry_count,
    EXTRACT(EPOCH FROM (now() - s.opened_at)) / 60 as duration_minutes,
    CASE
        WHEN s.monitoring_status = 'error' THEN '❌ Error'
        WHEN now() - s.last_heartbeat > '10 minutes'::interval THEN '⚠️ No Heartbeat'
        WHEN EXTRACT(EPOCH FROM (now() - s.opened_at)) / 60 > s.max_duration_minutes * 0.9 THEN '⏰ Near Timeout'
        ELSE '✅ Active'
    END as health_status
FROM public.mt5_signals s
WHERE s.status = 'opened'
ORDER BY s.opened_at DESC;

-- Grant permissions
GRANT SELECT ON public.active_trades_monitoring TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_trade_heartbeat() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_trade_timeouts() TO authenticated;

-- Log delle modifiche
INSERT INTO public.schema_versions (version, description, migration_date)
VALUES (
    '2.0.0',
    'Added comprehensive trade verification system with real-time tracking, heartbeat monitoring, and timeout management',
    now()
);