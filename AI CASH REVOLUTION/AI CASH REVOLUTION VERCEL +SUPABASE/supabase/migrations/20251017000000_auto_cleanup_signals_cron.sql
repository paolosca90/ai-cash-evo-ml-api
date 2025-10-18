-- =====================================================
-- AUTO CLEANUP SIGNALS - CRON JOB
-- =====================================================
-- Configura un cron job che chiama la funzione cleanup-old-signals-auto
-- ogni 10 minuti per pulire automaticamente i segnali vecchi
--
-- COSA FA:
-- 1. Elimina segnali con sent=false più vecchi di 10 minuti
-- 2. Marca processed=true per segnali anomali (sent=true, processed=false, >30 min)
--
-- REQUISITI:
-- - pg_cron extension deve essere abilitata
-- - Edge function cleanup-old-signals-auto deve essere deployata

-- Abilita pg_cron se non già abilitato (solo se hai i permessi)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Elimina il cron job se già esiste (per evitare duplicati)
DO $$
BEGIN
    PERFORM cron.unschedule('cleanup-old-mt5-signals');
EXCEPTION
    WHEN OTHERS THEN
        -- Job non esiste, continua
        NULL;
END $$;

-- Crea il cron job per eseguire cleanup ogni 10 minuti
SELECT cron.schedule(
    'cleanup-old-mt5-signals',  -- Nome del job
    '*/10 * * * *',              -- Schedule: ogni 10 minuti
    $$
    SELECT
      net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/cleanup-old-signals-auto',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
        ),
        body := '{}'::jsonb
      ) AS request_id;
    $$
);

-- Crea tabella per logging cleanup (opzionale ma consigliato)
CREATE TABLE IF NOT EXISTS public.cleanup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    old_signals_deleted INTEGER DEFAULT 0,
    anomalous_signals_fixed INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    status TEXT DEFAULT 'success',
    error_message TEXT,
    details JSONB
);

-- Indice per query rapide sui log
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_executed_at ON public.cleanup_logs(executed_at DESC);

-- RLS per cleanup_logs (solo lettura per utenti autenticati)
ALTER TABLE public.cleanup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cleanup logs" ON public.cleanup_logs
    FOR SELECT
    TO authenticated
    USING (true);

-- Commenti per documentazione
COMMENT ON TABLE public.cleanup_logs IS 'Log delle esecuzioni automatiche di pulizia segnali MT5';
COMMENT ON COLUMN public.cleanup_logs.old_signals_deleted IS 'Numero di segnali vecchi (sent=false, >10 min) eliminati';
COMMENT ON COLUMN public.cleanup_logs.anomalous_signals_fixed IS 'Numero di segnali anomali (sent=true, processed=false, >30 min) corretti';

-- Verifica che il cron job sia stato creato correttamente
DO $$
DECLARE
    job_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO job_count
    FROM cron.job
    WHERE jobname = 'cleanup-old-mt5-signals';

    IF job_count > 0 THEN
        RAISE NOTICE '✅ Cron job "cleanup-old-mt5-signals" configurato con successo';
        RAISE NOTICE 'Schedule: Ogni 10 minuti (*/10 * * * *)';
        RAISE NOTICE 'Funzione: cleanup-old-signals-auto';
    ELSE
        RAISE WARNING '⚠️  Cron job non creato - verifica che pg_cron sia abilitato';
    END IF;
END $$;
