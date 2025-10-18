-- Cron Job Configuration for Supabase
-- Requires pg_cron extension

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- ===== 1. PRICE TICK MONITOR (ogni minuto) =====
-- Monitora tutti i segnali aperti tick-by-tick
SELECT cron.schedule(
  'price-tick-monitor',
  '*/1 * * * *', -- Ogni minuto
  $$
    SELECT
      net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/price-tick-cron',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_key')
        ),
        body := jsonb_build_object()
      ) AS request_id;
  $$
);

-- ===== 2. ML AUTO RETRAIN (ogni 6 ore) =====
-- Riallena i pesi ML quando ci sono abbastanza nuovi dati
SELECT cron.schedule(
  'ml-auto-retrain',
  '0 */6 * * *', -- Ogni 6 ore (00:00, 06:00, 12:00, 18:00)
  $$
    SELECT
      net.http_post(
        url := current_setting('app.settings.supabase_url') || '/functions/v1/ml-auto-retrain',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_key')
        ),
        body := jsonb_build_object()
      ) AS request_id;
  $$
);

-- ===== 3. CLEANUP OLD SIGNALS (giornaliero alle 2 AM) =====
-- Rimuovi segnali vecchi (> 30 giorni) per mantenere il DB pulito
SELECT cron.schedule(
  'cleanup-old-signals',
  '0 2 * * *', -- Ogni giorno alle 2 AM
  $$
    DELETE FROM collective_signals
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND status IN ('TP_HIT', 'SL_HIT', 'EXPIRED');
  $$
);

-- ===== 4. EXPIRE STALE SIGNALS (ogni ora) =====
-- Chiudi segnali aperti da più di 24 ore senza TP/SL hit
SELECT cron.schedule(
  'expire-stale-signals',
  '0 * * * *', -- Ogni ora
  $$
    UPDATE collective_signals
    SET
      status = 'EXPIRED',
      exit_time = NOW(),
      updated_at = NOW()
    WHERE status = 'OPEN'
    AND entry_time < NOW() - INTERVAL '24 hours';
  $$
);

-- ===== Verifica cron jobs attivi =====
-- SELECT * FROM cron.job;

-- ===== Elimina un cron job (se necessario) =====
-- SELECT cron.unschedule('price-tick-monitor');
-- SELECT cron.unschedule('ml-auto-retrain');
-- SELECT cron.unschedule('cleanup-old-signals');
-- SELECT cron.unschedule('expire-stale-signals');

-- ===== Configurazione variabili (da eseguire una volta) =====
-- Sostituire con i valori reali del tuo progetto
/*
ALTER DATABASE postgres SET app.settings.supabase_url = 'https://YOUR_PROJECT.supabase.co';
ALTER DATABASE postgres SET app.settings.supabase_service_key = 'YOUR_SERVICE_ROLE_KEY';
*/
