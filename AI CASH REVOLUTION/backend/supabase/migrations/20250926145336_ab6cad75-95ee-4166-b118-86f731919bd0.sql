-- Configura le impostazioni per le email personalizzate
-- Imposta la configurazione per utilizzare la password-reset-email function

-- Prima abilita le estensioni necessarie se non già abilitate
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Configura il setting per la service role key (necessario per il trigger)
-- Questo deve essere fatto dall'admin di Supabase, ma prepariamo la struttura
DO $$
BEGIN
    -- Verifica se esiste già la configurazione
    IF NOT EXISTS (
        SELECT 1 FROM pg_settings WHERE name = 'app.settings.service_role_key'
    ) THEN
        -- Nota: questo setting deve essere configurato dall'admin
        RAISE NOTICE 'Service role key must be configured by Supabase admin';
    END IF;
END $$;