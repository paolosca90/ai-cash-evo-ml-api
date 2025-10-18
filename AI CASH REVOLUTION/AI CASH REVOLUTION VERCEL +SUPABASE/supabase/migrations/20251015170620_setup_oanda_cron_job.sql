-- ===================================================
-- AI CASH REVOLUTION - CRON JOB ADDESTRAMENTO AUTOMATICO OANDA
-- Migration per configurare esecuzioni randomiche di trading automatico
-- ===================================================

-- 1. VERIFICA E INSTALLAZIONE ESTENSIONE PG_CRON
DO $$
BEGIN
    -- Try to create pg_cron extension if it doesn't exist
    BEGIN
        CREATE EXTENSION IF NOT EXISTS pg_cron;
        RAISE LOG 'pg_cron extension installed successfully';
    EXCEPTION
        WHEN others THEN
            RAISE LOG 'Could not install pg_cron extension: %', SQLERRM;
            -- Continue anyway - it might already be available
    END;
END $$;

-- 2. RIMOZIONE JOB PRECEDENTI PER SICUREZZA
SELECT cron.unschedule('auto-oanda-trader-job') as result;

-- 3. CREAZIONE FUNZIONE CON RITARDO RANDOMICO
CREATE OR REPLACE FUNCTION trigger_auto_trader_randomly()
RETURNS void AS $$
DECLARE
    random_delay_seconds INT;
    execution_log JSONB;
BEGIN
    -- Genera ritardo casuale tra 0 e 240 secondi (0-4 minuti)
    random_delay_seconds := floor(random() * 240);

    -- Log per debug
    execution_log := jsonb_build_object(
        'timestamp', now(),
        'random_delay_seconds', random_delay_seconds,
        'action', 'waiting_before_trade_execution'
    );

    -- Inserisci log per monitoraggio
    INSERT INTO cron.job_logs (jobid, status, output, run_at)
    VALUES (
        (SELECT jobid FROM cron.job WHERE jobname = 'auto-oanda-trader-job'),
        'starting',
        jsonb_pretty(execution_log),
        now()
    ) ON CONFLICT DO NOTHING;

    -- Attendi il ritardo random
    PERFORM pg_sleep(random_delay_seconds);

    -- Esegui la Edge Function per trading automatico OANDA
    PERFORM net.http_post(
        url := 'https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/auto-oanda-trader',
        headers := jsonb_build_object(
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2b3BtZGZsbmVjeXJ3cnpoeWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyOTAyNTgwOCwiZXhwIjoyMDQ0NjAxODA4fQ.3F_CiSpQPRQj2U2u2JJ1_x1P9Oa21cLjLhV1bVdXQIo',
            'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
            'mode', 'single',
            'symbols', ARRAY['EURUSD', 'GBPUSD', 'XAUUSD'],
            'dry_run', false,
            'trigger_type', 'cron_random',
            'random_delay', random_delay_seconds
        )
    );

    -- Log di completamento
    execution_log := jsonb_build_object(
        'timestamp', now(),
        'random_delay_seconds', random_delay_seconds,
        'action', 'trade_execution_completed'
    );

    -- Aggiorna log finale
    UPDATE cron.job_logs
    SET status = 'completed', output = jsonb_pretty(execution_log)
    WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-oanda-trader-job')
    AND run_at = now() - interval '1 second';

    RAISE LOG 'Auto OANDA Trader executed with %s seconds random delay', random_delay_seconds;

EXCEPTION
    WHEN OTHERS THEN
        -- Log di errore
        execution_log := jsonb_build_object(
            'timestamp', now(),
            'error', SQLERRM,
            'action', 'trade_execution_failed'
        );

        -- Inserisci log di errore
        INSERT INTO cron.job_logs (jobid, status, output, run_at)
        VALUES (
            (SELECT jobid FROM cron.job WHERE jobname = 'auto-oanda-trader-job'),
            'failed',
            jsonb_pretty(execution_log),
            now()
        ) ON CONFLICT DO NOTHING;

        RAISE LOG 'Auto OANDA Trader failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 4. CREAZIONE TABELLA PER LOGGING (SE NON ESISTE)
CREATE TABLE IF NOT EXISTS cron.job_logs (
    log_id BIGSERIAL PRIMARY KEY,
    jobid INT,
    status TEXT,
    output TEXT,
    run_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cron_job_logs_run_at ON cron.job_logs(run_at);
CREATE INDEX IF NOT EXISTS idx_cron_job_logs_status ON cron.job_logs(status);

-- 5. PIANIFICAZIONE CRON JOB - OGNI 5 MINUTI
SELECT cron.schedule(
    'auto-oanda-trader-job',
    '*/5 * * * *',  -- Ogni 5 minuti
    'SELECT trigger_auto_trader_randomly();'
) as schedule_result;

-- 6. CREAZIONE FUNZIONI HELPER PER CONTROLLO

-- Funzione per abilitare/disabilitare auto-trading
CREATE OR REPLACE FUNCTION toggle_auto_trading(enable boolean DEFAULT true)
RETURNS TABLE(success boolean, message TEXT) AS $$
BEGIN
    IF enable THEN
        -- Abilita il job se esiste
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-oanda-trader-job') THEN
            UPDATE cron.job SET active = true WHERE jobname = 'auto-oanda-trader-job';
            RETURN QUERY SELECT true, 'Auto-trading OANDA abilitato con successo'::TEXT;
        ELSE
            RETURN QUERY SELECT false, 'Job auto-oanda-trader-job non trovato'::TEXT;
        END IF;
    ELSE
        -- Disabilita il job
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-oanda-trader-job') THEN
            UPDATE cron.job SET active = false WHERE jobname = 'auto-oanda-trader-job';
            RETURN QUERY SELECT true, 'Auto-trading OANDA disabilitato con successo'::TEXT;
        ELSE
            RETURN QUERY SELECT false, 'Job auto-oanda-trader-job non trovato'::TEXT;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Funzione per verificare lo stato del sistema
CREATE OR REPLACE FUNCTION get_auto_trading_status()
RETURNS TABLE(
    job_active boolean,
    last_execution TIMESTAMPTZ,
    total_executions BIGINT,
    successful_executions BIGINT,
    failed_executions BIGINT,
    next_execution TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        j.active,
        MAX(l.run_at) as last_execution,
        COUNT(*) as total_executions,
        COUNT(*) FILTER (WHERE l.status = 'completed') as successful_executions,
        COUNT(*) FILTER (WHERE l.status = 'failed') as failed_executions,
        j.nextrun as next_execution
    FROM cron.job j
    LEFT JOIN cron.job_logs l ON j.jobid = l.jobid
    WHERE j.jobname = 'auto-oanda-trader-job'
    GROUP BY j.jobid, j.active, j.nextrun;
END;
$$ LANGUAGE plpgsql;

-- 7. VERIFICA CONFIGURAZIONE INIZIALE
DO $$
DECLARE
    extension_count INT;
    job_count INT;
BEGIN
    -- Verifica se pg_cron è disponibile
    SELECT COUNT(*) INTO extension_count
    FROM pg_extension
    WHERE extname = 'pg_cron';

    IF extension_count > 0 THEN
        RAISE LOG '✅ pg_cron extension is available';
    ELSE
        RAISE LOG '❌ pg_cron extension is NOT available - job may not work';
    END IF;

    -- Verifica se il job è stato creato
    SELECT COUNT(*) INTO job_count
    FROM cron.job
    WHERE jobname = 'auto-oanda-trader-job';

    IF job_count > 0 THEN
        RAISE LOG '✅ Auto OANDA Trader cron job created successfully';

        -- Mostra dettagli del job
        FOR job_record IN
            SELECT jobid, jobname, schedule, active, command
            FROM cron.job
            WHERE jobname = 'auto-oanda-trader-job'
        LOOP
            RAISE LOG 'Job Details: ID=%, Name=%, Schedule=%, Active=%',
                job_record.jobid, job_record.jobname,
                job_record.schedule, job_record.active;
        END LOOP;
    ELSE
        RAISE LOG '❌ Failed to create Auto OANDA Trader cron job';
    END IF;
END $$;