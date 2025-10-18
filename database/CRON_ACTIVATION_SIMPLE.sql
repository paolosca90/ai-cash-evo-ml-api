-- ============================================
-- ATTIVAZIONE CRON JOBS (METODO SEMPLIFICATO)
-- ============================================
-- Questo script NON richiede permessi speciali
-- Usa valori hardcoded invece di parametri DB
-- ============================================

-- 1. Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Schedule price-tick-monitor (ogni 1 minuto)
-- SOSTITUISCI: YOUR_SERVICE_KEY con il tuo service_role key
SELECT cron.schedule(
  'price-tick-monitor',
  '*/1 * * * *',
  $$
    SELECT
      net.http_post(
        url := 'https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/price-tick-cron',
        headers := '{"Authorization": "Bearer YOUR_SERVICE_KEY", "Content-Type": "application/json"}'::jsonb
      ) as request_id;
  $$
);

-- 3. Schedule ml-auto-retrain (ogni 6 ore)
-- SOSTITUISCI: YOUR_SERVICE_KEY con il tuo service_role key
SELECT cron.schedule(
  'ml-auto-retrain',
  '0 */6 * * *',
  $$
    SELECT
      net.http_post(
        url := 'https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/ml-auto-retrain',
        headers := '{"Authorization": "Bearer YOUR_SERVICE_KEY", "Content-Type": "application/json"}'::jsonb
      ) as request_id;
  $$
);

-- 4. Verify cron jobs sono attivi
SELECT 
  jobid,
  jobname,
  schedule,
  active,
  command
FROM cron.job
ORDER BY jobname;

-- ============================================
-- ISTRUZIONI:
-- ============================================
-- 1. Vai su: Dashboard → Settings → API
-- 2. Copia il "service_role" key (secret)
-- 3. Sostituisci "YOUR_SERVICE_KEY" in ENTRAMBI i cron (linee 15 e 29)
-- 4. Esegui questo script nel SQL Editor
-- 5. Verifica che l'ultima query mostri i 2 cron attivi
-- ============================================

-- ============================================
-- TROUBLESHOOTING:
-- ============================================

-- Se pg_cron non è disponibile, vedrai:
-- ERROR: extension "pg_cron" is not available

-- Soluzione:
-- 1. Dashboard → Support
-- 2. Richiedi: "Please enable pg_cron extension for my project"
-- 3. Oppure usa GitHub Actions (vedi CRON_GITHUB_ACTIONS.yml)

-- Per disabilitare i cron:
-- SELECT cron.unschedule('price-tick-monitor');
-- SELECT cron.unschedule('ml-auto-retrain');

-- Per vedere i log dei cron:
-- SELECT * FROM cron.job_run_details 
-- WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname IN ('price-tick-monitor', 'ml-auto-retrain'))
-- ORDER BY start_time DESC LIMIT 20;
-- ============================================
