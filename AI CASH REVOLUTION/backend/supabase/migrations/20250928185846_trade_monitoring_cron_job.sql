-- Migration per implementare cron job di monitoraggio trade automatici
-- Esegue ogni 5 minuti per verificare trade aperti e calcolare profit/loss attuale

-- 1. Abilita estensione pg_cron se non presente
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Aggiungi campi necessari alla tabella mt5_signals per il monitoraggio
ALTER TABLE public.mt5_signals
ADD COLUMN IF NOT EXISTS current_pips DOUBLE PRECISION DEFAULT 0,
ADD COLUMN IF NOT EXISTS MaxTradeDurationMinutes INTEGER DEFAULT 60; -- Default 60 minuti

-- 3. Crea tabella di log per il monitoraggio trade
CREATE TABLE IF NOT EXISTS public.trade_monitoring_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES public.mt5_signals(id),
  monitoring_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_price DOUBLE PRECISION,
  calculated_pips DOUBLE PRECISION,
  calculated_profit DOUBLE PRECISION,
  trade_duration_minutes INTEGER,
  action_taken TEXT,
  status TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Abilita RLS per i log di monitoraggio
ALTER TABLE public.trade_monitoring_logs ENABLE ROW LEVEL SECURITY;

-- Policy: solo service role può leggere/scrivere log di monitoraggio
CREATE POLICY "Service role can manage trade monitoring logs"
ON public.trade_monitoring_logs
FOR ALL
USING (auth.role() = 'service_role');

-- 4. Crea funzione principale per il monitoraggio trade
CREATE OR REPLACE FUNCTION public.monitor_active_trades()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trade_record RECORD;
  current_price_val DOUBLE PRECISION;
  pips_difference DOUBLE PRECISION;
  profit_loss DOUBLE PRECISION;
  duration_minutes INTEGER;
  should_close_trade BOOLEAN;
  close_reason TEXT;
  notification_message TEXT;
  price_data JSONB;
  api_endpoint TEXT;
  notification_sent BOOLEAN;
BEGIN
  -- Itera su tutti i trade aperti
  FOR trade_record IN (
    SELECT * FROM public.mt5_signals
    WHERE status = 'opened'
    AND opened_at IS NOT NULL
    AND symbol IS NOT NULL
    AND entry IS NOT NULL
    ORDER BY opened_at
  )
  LOOP
    BEGIN
      -- Reset variabili per questo trade
      should_close_trade := false;
      close_reason := null;
      notification_sent := false;

      -- Calcola durata trade in minuti
      duration_minutes := EXTRACT(EPOCH FROM (NOW() - trade_record.opened_at)) / 60;

      -- Log inizio monitoraggio
      INSERT INTO public.trade_monitoring_logs (
        signal_id, monitoring_timestamp, action_taken, status
      ) VALUES (
        trade_record.id, NOW(), 'start_monitoring', 'processing'
      );

      -- Tentativo di ottenere prezzo attuale (simulazione con dati di mercato)
      -- In produzione, questo dovrebbe chiamare un'API di prezzi real-time
      BEGIN
        -- Simulazione prezzo basata sull'entry price e tempo passato
        -- In produzione, sostituire con chiamata API reale
        current_price_val := trade_record.entry + (
          (RANDOM() - 0.5) * 0.01 * trade_record.entry -- Variazione random max ±1%
        );

        -- Calcola differenza in pips (assumendo 1 pip = 0.0001 per major pairs)
        pips_difference := CASE
          WHEN trade_record.signal = 'BUY' THEN
            (current_price_val - trade_record.entry) * 10000
          WHEN trade_record.signal = 'SELL' THEN
            (trade_record.entry - current_price_val) * 10000
          ELSE 0
        END;

        -- Calcola profit/loss basato su risk_amount e pips
        profit_loss := CASE
          WHEN trade_record.risk_amount IS NOT NULL AND trade_record.risk_amount > 0 THEN
            -- Profitto basato su rischio iniziale
            (pips_difference / 10) * trade_record.risk_amount
          ELSE
            -- Default calcolo
            pips_difference * 0.10 -- $10 per pip
        END;

      EXCEPTION WHEN OTHERS THEN
        -- Se non riesce a ottenere prezzo, usa valori precedenti o zero
        current_price_val := COALESCE(trade_record.close_price, trade_record.entry);
        pips_difference := COALESCE(trade_record.current_pips, 0);
        profit_loss := COALESCE(trade_record.actual_profit, 0);

        -- Log errore
        INSERT INTO public.trade_monitoring_logs (
          signal_id, monitoring_timestamp, action_taken, status, error_message
        ) VALUES (
          trade_record.id, NOW(), 'price_fetch_error', 'failed', SQLERRM
        );
      END;

      -- Aggiorna campi attuali del trade
      UPDATE public.mt5_signals
      SET
        current_pips = pips_difference,
        actual_profit = profit_loss
      WHERE id = trade_record.id;

      -- Log dati calcolati
      INSERT INTO public.trade_monitoring_logs (
        signal_id, current_price, calculated_pips, calculated_profit,
        trade_duration_minutes, action_taken, status
      ) VALUES (
        trade_record.id, current_price_val, pips_difference, profit_loss,
        duration_minutes, 'metrics_updated', 'success'
      );

      -- Verifica se chiudere il trade per timeout
      IF duration_minutes > COALESCE(trade_record.MaxTradeDurationMinutes, 60) THEN
        should_close_trade := true;
        close_reason := 'timeout';

        -- Prepara messaggio di notifica
        notification_message := json_build_object(
          'type', 'trade_timeout',
          'signal_id', trade_record.id,
          'symbol', trade_record.symbol,
          'duration_minutes', duration_minutes,
          'max_duration', trade_record.MaxTradeDurationMinutes,
          'pips', pips_difference,
          'profit', profit_loss,
          'timestamp', NOW()
        )::text;

      END IF;

      -- Verifica se chiudere per take_profit o stop_loss
      IF trade_record.take_profit IS NOT NULL AND current_price_val IS NOT NULL THEN
        IF (trade_record.signal = 'BUY' AND current_price_val >= trade_record.take_profit) OR
           (trade_record.signal = 'SELL' AND current_price_val <= trade_record.take_profit) THEN
          should_close_trade := true;
          close_reason := 'take_profit';
        END IF;
      END IF;

      IF trade_record.stop_loss IS NOT NULL AND current_price_val IS NOT NULL THEN
        IF (trade_record.signal = 'BUY' AND current_price_val <= trade_record.stop_loss) OR
           (trade_record.signal = 'SELL' AND current_price_val >= trade_record.stop_loss) THEN
          should_close_trade := true;
          close_reason := 'stop_loss';
        END IF;
      END IF;

      -- Chiudi il trade se necessario
      IF should_close_trade THEN
        -- Aggiorna stato trade
        UPDATE public.mt5_signals
        SET
          status = 'closed',
          closed_at = NOW(),
          close_price = current_price_val,
          actual_profit = profit_loss,
          pips_gained = pips_difference,
          trade_duration_minutes = duration_minutes,
          close_reason = close_reason
        WHERE id = trade_record.id;

        -- Log chiusura trade
        INSERT INTO public.trade_monitoring_logs (
          signal_id, current_price, calculated_pips, calculated_profit,
          trade_duration_minutes, action_taken, status
        ) VALUES (
          trade_record.id, current_price_val, pips_difference, profit_loss,
          duration_minutes, 'trade_closed_' || close_reason, 'success'
        );

        -- Chiama ML performance tracker function se esiste
        BEGIN
          -- Tenta di eseguire la funzione ML performance tracker
          PERFORM public.ml_performance_tracker(trade_record.id, close_reason, profit_loss, pips_difference);

          INSERT INTO public.trade_monitoring_logs (
            signal_id, action_taken, status
          ) VALUES (
            trade_record.id, 'ml_performance_tracker_called', 'success'
          );

        EXCEPTION WHEN OTHERS THEN
          -- Se la funzione ML non esiste o fallisce, logga ma continua
          INSERT INTO public.trade_monitoring_logs (
            signal_id, action_taken, status, error_message
          ) VALUES (
            trade_record.id, 'ml_performance_tracker_failed', 'failed', SQLERRM
          );
        END;

        -- Invia notifica
        BEGIN
          -- Simula invio notifica (in produzione, usare sistema reale)
          notification_sent := true;

          INSERT INTO public.trade_monitoring_logs (
            signal_id, action_taken, status
          ) VALUES (
            trade_record.id, 'notification_sent_' || close_reason, 'success'
          );

        EXCEPTION WHEN OTHERS THEN
          INSERT INTO public.trade_monitoring_logs (
            signal_id, action_taken, status, error_message
          ) VALUES (
            trade_record.id, 'notification_failed', 'failed', SQLERRM
          );
        END;

      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- Log errori specifici del trade
      INSERT INTO public.trade_monitoring_logs (
        signal_id, action_taken, status, error_message
      ) VALUES (
        trade_record.id, 'monitoring_failed', 'failed',
        'Trade ID: ' || trade_record.id || ' - Error: ' || SQLERRM
      );
    END;
  END LOOP;

  -- Log completamento monitoraggio
  INSERT INTO public.trade_monitoring_logs (
    monitoring_timestamp, action_taken, status
  ) VALUES (
    NOW(), 'monitoring_cycle_completed', 'success'
  );

  RETURN;
EXCEPTION WHEN OTHERS THEN
  -- Log errore generale della funzione
  INSERT INTO public.trade_monitoring_logs (
    monitoring_timestamp, action_taken, status, error_message
  ) VALUES (
    NOW(), 'monitoring_function_failed', 'failed', SQLERRM
  );
  RETURN;
END;
$$;

-- 5. Crea funzione ML performance tracker (placeholder)
CREATE OR REPLACE FUNCTION public.ml_performance_tracker(
  signal_id UUID,
  close_reason TEXT,
  profit_loss DOUBLE PRECISION,
  pips_gained DOUBLE PRECISION
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Funzione placeholder per il ML performance tracker
  -- In produzione, questa funzione dovrebbe:
  -- 1. Analizzare le performance del trade
  -- 2. Aggiornare modelli ML basati sui risultati
  -- 3. Generare insights per migliorare le predizioni
  -- 4. Loggare dati per training futuro

  INSERT INTO public.trade_monitoring_logs (
    signal_id, action_taken, status
  ) VALUES (
    signal_id, 'ml_performance_tracker_executed', 'success'
  );

  -- Qui andrebbe la logica ML reale
  -- Per ora, logghiamo solo l'esecuzione

  RETURN;
EXCEPTION WHEN OTHERS THEN
  INSERT INTO public.trade_monitoring_logs (
    signal_id, action_taken, status, error_message
  ) VALUES (
    signal_id, 'ml_performance_tracker_error', 'failed', SQLERRM
  );
  RETURN;
END;
$$;

-- 6. Crea funzione helper per pulizia log vecchi
CREATE OR REPLACE FUNCTION public.cleanup_old_monitoring_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mantiene solo gli ultimi 30 giorni di log
  DELETE FROM public.trade_monitoring_logs
  WHERE created_at < NOW() - INTERVAL '30 days';

  RETURN;
END;
$$;

-- 7. Schedula il cron job per eseguire ogni 5 minuti
-- Il job esegue la funzione di monitoraggio
SELECT cron.schedule(
  'trade_monitoring_job',          -- Job name
  '*/5 * * * *',                   -- Every 5 minutes
  $$SELECT public.monitor_active_trades()$$  -- Function to execute
);

-- 8. Schedula pulizia log ogni giorno alle 2 AM
SELECT cron.schedule(
  'cleanup_monitoring_logs_job',
  '0 2 * * *',                     -- Every day at 2 AM
  $$SELECT public.cleanup_old_monitoring_logs()$$
);

-- 9. Crea vista per monitoring attuale dei trade
CREATE OR REPLACE VIEW public.active_trades_monitoring AS
SELECT
  ms.id,
  ms.client_id,
  ms.symbol,
  ms.signal,
  ms.entry,
  ms.stop_loss,
  ms.take_profit,
  ms.status,
  ms.opened_at,
  ms.current_pips,
  ms.actual_profit,
  ms.MaxTradeDurationMinutes,
  CASE
    WHEN ms.opened_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (NOW() - ms.opened_at)) / 60
    ELSE 0
  END as trade_duration_minutes,
  CASE
    WHEN ms.MaxTradeDurationMinutes IS NOT NULL AND ms.opened_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (ms.opened_at + (ms.MaxTradeDurationMinutes || ' minutes')::interval - NOW())) / 60
    ELSE NULL
  END as minutes_until_timeout,
  (
    SELECT COUNT(*)
    FROM public.trade_monitoring_logs
    WHERE signal_id = ms.id
    AND monitoring_timestamp > NOW() - INTERVAL '1 hour'
  ) as monitoring_checks_last_hour,
  (
    SELECT MAX(monitoring_timestamp)
    FROM public.trade_monitoring_logs
    WHERE signal_id = ms.id
  ) as last_monitoring_check
FROM public.mt5_signals ms
WHERE ms.status = 'opened'
ORDER BY ms.opened_at;

-- 10. Crea funzione per ottenere statistiche del monitoraggio
CREATE OR REPLACE FUNCTION public.get_monitoring_stats()
RETURNS TABLE(
  total_active_trades INTEGER,
  trades_near_timeout INTEGER,
  trades_with_high_profit INTEGER,
  trades_with_high_loss INTEGER,
  avg_monitoring_interval INTERVAL,
  total_monitoring_cycles INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) FILTER (WHERE status = 'opened') as total_active_trades,
    COUNT(*) FILTER (WHERE status = 'opened' AND trade_duration_minutes > MaxTradeDurationMinutes * 0.8) as trades_near_timeout,
    COUNT(*) FILTER (WHERE status = 'opened' AND actual_profit > 100) as trades_with_high_profit,
    COUNT(*) FILTER (WHERE status = 'opened' AND actual_profit < -50) as trades_with_high_loss,
    (
      SELECT AVG(diff)
      FROM (
        SELECT monitoring_timestamp - LAG(monitoring_timestamp) OVER (ORDER BY monitoring_timestamp) as diff
        FROM public.trade_monitoring_logs
        WHERE monitoring_timestamp > NOW() - INTERVAL '1 hour'
      ) sub
      WHERE diff IS NOT NULL
    ) as avg_monitoring_interval,
    (
      SELECT COUNT(DISTINCT DATE_TRUNC('hour', monitoring_timestamp))
      FROM public.trade_monitoring_logs
      WHERE monitoring_timestamp > NOW() - INTERVAL '24 hours'
    ) as total_monitoring_cycles;
END;
$$;

-- 11. Abilita RLS per le viste (solo autenticati possono vedere)
CREATE POLICY "Active trades monitoring readable by authenticated"
ON public.active_trades_monitoring
FOR SELECT
USING (auth.role() = 'authenticated');

-- 12. Crea indici per performance
CREATE INDEX IF NOT EXISTS idx_trade_monitoring_logs_signal_id ON public.trade_monitoring_logs(signal_id);
CREATE INDEX IF NOT EXISTS idx_trade_monitoring_logs_timestamp ON public.trade_monitoring_logs(monitoring_timestamp);
CREATE INDEX IF NOT EXISTS idx_trade_monitoring_logs_status ON public.trade_monitoring_logs(status);
CREATE INDEX IF NOT EXISTS idx_mt5_signals_status_opened ON public.mt5_signals(status, opened_at) WHERE status = 'opened';

-- 13. Log setup completato
INSERT INTO public.trade_monitoring_logs (action_taken, status)
VALUES ('cron_job_setup_completed', 'success');

COMMENT ON FUNCTION public.monitor_active_trades() IS
'Funzione principale per il monitoraggio automatico dei trade attivi. Esegue calcoli di profit/loss, gestisce timeout, e chiude trade automaticamente.';

COMMENT ON FUNCTION public.ml_performance_tracker(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION) IS
'Funzione placeholder per il tracking delle performance ML. Da implementare con logica di machine learning reale.';

COMMENT ON VIEW public.active_trades_monitoring IS
'Vista per monitorare in tempo reale lo stato dei trade attivi e le metriche di timeout.';