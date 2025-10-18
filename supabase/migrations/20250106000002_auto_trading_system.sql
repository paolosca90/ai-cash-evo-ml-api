-- ============================================================================
-- AUTO TRADING SYSTEM - Continuous Learning & Signal Generation
-- ============================================================================

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- 1. AUTO SIGNAL GENERATION (Every 10-30 minutes with random interval)
-- ============================================================================

-- Table to track generation schedule
CREATE TABLE IF NOT EXISTS signal_generation_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  next_run_at TIMESTAMPTZ NOT NULL,
  interval_seconds INT NOT NULL,
  symbols_count INT DEFAULT 3,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to schedule next signal generation with random interval
CREATE OR REPLACE FUNCTION schedule_next_signal_generation()
RETURNS VOID AS $$
DECLARE
  random_interval INT;
BEGIN
  -- Random interval between 10 and 30 minutes (600-1800 seconds)
  random_interval := 600 + FLOOR(RANDOM() * 1200)::INT;

  INSERT INTO signal_generation_schedule (
    next_run_at,
    interval_seconds,
    symbols_count,
    status
  ) VALUES (
    NOW() + (random_interval || ' seconds')::INTERVAL,
    random_interval,
    2 + FLOOR(RANDOM() * 4)::INT,  -- Random 2-5 symbols per batch
    'pending'
  );

  RAISE NOTICE 'Next signal generation scheduled in % seconds (% minutes)',
    random_interval, ROUND(random_interval / 60.0, 1);
END;
$$ LANGUAGE plpgsql;

-- Function to trigger signal generation via Edge Function
CREATE OR REPLACE FUNCTION trigger_signal_generation()
RETURNS VOID AS $$
DECLARE
  schedule_record RECORD;
BEGIN
  -- Get next pending schedule
  SELECT * INTO schedule_record
  FROM signal_generation_schedule
  WHERE status = 'pending'
    AND next_run_at <= NOW()
  ORDER BY next_run_at
  LIMIT 1;

  IF schedule_record IS NULL THEN
    -- No pending schedule, create one
    PERFORM schedule_next_signal_generation();
    RETURN;
  END IF;

  -- Mark as executing
  UPDATE signal_generation_schedule
  SET status = 'executing'
  WHERE id = schedule_record.id;

  -- Call Edge Function via HTTP (pg_net extension required)
  -- Note: Questo richiede pg_net, altrimenti usa supabase_functions.http_request
  PERFORM
    net.http_post(
      url := 'https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/auto-signal-generator',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'mode', 'single',
        'symbolsPerBatch', schedule_record.symbols_count
      )
    );

  -- Mark as completed
  UPDATE signal_generation_schedule
  SET status = 'completed'
  WHERE id = schedule_record.id;

  -- Schedule next generation
  PERFORM schedule_next_signal_generation();

EXCEPTION WHEN OTHERS THEN
  -- Mark as failed
  UPDATE signal_generation_schedule
  SET status = 'failed'
  WHERE id = schedule_record.id;

  RAISE WARNING 'Signal generation failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. AUTO RESULT UPDATER (Every 5 minutes)
-- ============================================================================

-- Function to trigger result update via Edge Function
CREATE OR REPLACE FUNCTION trigger_result_update()
RETURNS VOID AS $$
BEGIN
  PERFORM
    net.http_post(
      url := 'https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/auto-result-updater',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb
    );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Result update failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. CRON JOBS SETUP (using pg_cron)
-- ============================================================================

-- Remove existing cron jobs if any
SELECT cron.unschedule('auto-signal-generation') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-signal-generation'
);

SELECT cron.unschedule('auto-result-update') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-result-update'
);

-- Cron Job 1: Signal Generation (check every 5 minutes if it's time to generate)
SELECT cron.schedule(
  'auto-signal-generation',
  '*/5 * * * *',  -- Every 5 minutes
  $$SELECT trigger_signal_generation()$$
);

-- Cron Job 2: Result Update (every 5 minutes)
SELECT cron.schedule(
  'auto-result-update',
  '*/5 * * * *',  -- Every 5 minutes
  $$SELECT trigger_result_update()$$
);

-- Initialize first schedule
SELECT schedule_next_signal_generation();

-- ============================================================================
-- 4. MONITORING & ANALYTICS
-- ============================================================================

-- View for system health monitoring
CREATE OR REPLACE VIEW auto_trading_system_health AS
SELECT
  (SELECT COUNT(*) FROM signal_performance WHERE created_at > NOW() - INTERVAL '24 hours') as signals_last_24h,
  (SELECT COUNT(*) FROM signal_performance WHERE created_at > NOW() - INTERVAL '1 hour') as signals_last_hour,
  (SELECT COUNT(*) FROM signal_performance WHERE win IS NOT NULL AND created_at > NOW() - INTERVAL '24 hours') as completed_last_24h,
  (SELECT COUNT(*) FROM signal_performance WHERE win IS NULL AND created_at > NOW() - INTERVAL '1 hour') as pending_signals,
  (SELECT status FROM signal_generation_schedule ORDER BY created_at DESC LIMIT 1) as last_generation_status,
  (SELECT next_run_at FROM signal_generation_schedule WHERE status = 'pending' ORDER BY next_run_at LIMIT 1) as next_generation_at,
  (SELECT COUNT(*) FROM ensemble_weights) as symbols_with_weights,
  (SELECT AVG(sample_size) FROM ensemble_weights) as avg_sample_size;

COMMENT ON VIEW auto_trading_system_health IS 'Real-time health monitoring of auto trading system';

-- ============================================================================
-- 5. UTILITY FUNCTIONS
-- ============================================================================

-- Function to pause/resume auto trading
CREATE OR REPLACE FUNCTION set_auto_trading_status(p_enabled BOOLEAN)
RETURNS TEXT AS $$
BEGIN
  IF p_enabled THEN
    -- Resume: re-enable cron jobs
    PERFORM cron.schedule(
      'auto-signal-generation',
      '*/5 * * * *',
      $$SELECT trigger_signal_generation()$$
    );

    PERFORM cron.schedule(
      'auto-result-update',
      '*/5 * * * *',
      $$SELECT trigger_result_update()$$
    );

    -- Schedule next generation if none pending
    IF NOT EXISTS (SELECT 1 FROM signal_generation_schedule WHERE status = 'pending') THEN
      PERFORM schedule_next_signal_generation();
    END IF;

    RETURN 'Auto trading ENABLED';
  ELSE
    -- Pause: unschedule cron jobs
    PERFORM cron.unschedule('auto-signal-generation');
    PERFORM cron.unschedule('auto-result-update');

    -- Cancel pending schedules
    DELETE FROM signal_generation_schedule WHERE status = 'pending';

    RETURN 'Auto trading DISABLED';
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_auto_trading_status IS 'Enable or disable auto trading system';

-- Function to get system statistics
CREATE OR REPLACE FUNCTION get_auto_trading_stats()
RETURNS TABLE(
  total_signals INT,
  win_rate FLOAT,
  total_pnl FLOAT,
  signals_per_day FLOAT,
  avg_confidence FLOAT,
  top_symbols TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INT as total_signals,
    ROUND(
      (COUNT(*) FILTER (WHERE win = true)::FLOAT / NULLIF(COUNT(*) FILTER (WHERE win IS NOT NULL), 0)) * 100,
      2
    ) as win_rate,
    ROUND(SUM(actual_result)::NUMERIC, 2)::FLOAT as total_pnl,
    ROUND(
      COUNT(*)::FLOAT / NULLIF(EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) / 86400, 0),
      1
    ) as signals_per_day,
    ROUND(AVG(confidence)::NUMERIC, 1)::FLOAT as avg_confidence,
    ARRAY(
      SELECT symbol
      FROM signal_performance
      WHERE win IS NOT NULL
      GROUP BY symbol
      ORDER BY COUNT(*) DESC
      LIMIT 5
    ) as top_symbols
  FROM signal_performance;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON auto_trading_system_health TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_auto_trading_stats TO authenticated, anon;
GRANT EXECUTE ON FUNCTION set_auto_trading_status TO service_role;

-- ============================================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE signal_generation_schedule IS 'Tracks irregular signal generation schedule';
COMMENT ON FUNCTION schedule_next_signal_generation IS 'Schedules next signal generation with random 10-30 min interval';
COMMENT ON FUNCTION trigger_signal_generation IS 'Triggers signal generation via Edge Function when scheduled time arrives';
COMMENT ON FUNCTION trigger_result_update IS 'Triggers result update via Edge Function to check SL/TP hits';

-- ============================================================================
-- INITIAL STATUS
-- ============================================================================

SELECT 'Auto Trading System Setup Complete!' as status;
SELECT * FROM auto_trading_system_health;
