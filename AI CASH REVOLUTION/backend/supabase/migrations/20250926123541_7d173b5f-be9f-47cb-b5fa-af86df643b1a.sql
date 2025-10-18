-- Abilitare le estensioni necessarie per il cron job
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Creare il cron job per aggiornare il calendario economico ogni mattina alle 7:00 UTC
-- Questo equivale alle 8:00/9:00 in Italia (dipende da ora legale/solare)
SELECT cron.schedule(
  'daily-economic-calendar-update',
  '0 7 * * *', -- Ogni giorno alle 7:00 UTC
  $$
  SELECT
    net.http_post(
        url:='https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/update-economic-calendar',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NDc4ODQsImV4cCI6MjA3NDEyMzg4NH0.snlFF1ChbYsA765gXE-cMGb11jHIaF2np_pNxIGLgW8"}'::jsonb,
        body:='{"update_type": "SCHEDULED"}'::jsonb
    ) as request_id;
  $$
);

-- Creare anche un job per la pulizia settimanale dei dati vecchi (ogni domenica alle 6:00 UTC)
SELECT cron.schedule(
  'weekly-economic-calendar-cleanup',
  '0 6 * * 0', -- Ogni domenica alle 6:00 UTC
  $$
  SELECT public.cleanup_old_economic_events();
  $$
);