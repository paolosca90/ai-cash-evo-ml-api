-- Enable Auto Trading System with Signal Weight Filtering
-- Conservative approach: Start with limited trading hours and strict filtering

-- ============================================================================
-- 1. CONFIGURATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS auto_trading_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT false,
  mode TEXT DEFAULT 'continuous' CHECK (mode IN ('single', 'continuous')),

  -- Trading schedule
  trading_hours_start INTEGER DEFAULT 8,   -- UTC hour to start (London open)
  trading_hours_end INTEGER DEFAULT 16,    -- UTC hour to stop (London close)
  duration_minutes INTEGER DEFAULT 120,     -- How long to run each session

  -- Intervals
  min_interval_seconds INTEGER DEFAULT 1200,  -- 20 min between trades
  max_interval_seconds INTEGER DEFAULT 1800,  -- 30 min between trades

  -- Weight filtering
  min_weight_threshold DECIMAL(5,2) DEFAULT 70.00,
  skip_weight_filter BOOLEAN DEFAULT false,  -- Emergency override

  -- Safety limits
  max_daily_trades INTEGER DEFAULT 10,
  max_concurrent_positions INTEGER DEFAULT 3,
  max_daily_loss DECIMAL(10,2) DEFAULT 100.00,  -- USD

  -- Monitoring
  last_run_at TIMESTAMPTZ,
  trades_today INTEGER DEFAULT 0,
  daily_pnl DECIMAL(10,2) DEFAULT 0.00,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default configuration (DISABLED by default for safety)
INSERT INTO auto_trading_config (enabled) VALUES (false)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE auto_trading_config IS 'Configuration for auto-trading system with weight filtering';
COMMENT ON COLUMN auto_trading_config.min_weight_threshold IS 'Minimum weight to execute trade (70 = 100% win rate from backtest)';

-- ============================================================================
-- 2. TRADING LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS auto_trading_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'stopped')),
  mode TEXT NOT NULL,

  -- Results
  total_attempts INTEGER DEFAULT 0,
  successful_trades INTEGER DEFAULT 0,
  skipped_low_weight INTEGER DEFAULT 0,
  execution_rate DECIMAL(5,2),

  -- Details
  symbols_traded TEXT[],
  error_message TEXT,
  duration_seconds INTEGER,

  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  CONSTRAINT unique_run_id UNIQUE (run_id)
);

CREATE INDEX IF NOT EXISTS idx_auto_trading_log_status ON auto_trading_log(status);
CREATE INDEX IF NOT EXISTS idx_auto_trading_log_started ON auto_trading_log(started_at DESC);

COMMENT ON TABLE auto_trading_log IS 'Log of auto-trading system executions';

-- ============================================================================
-- 3. FUNCTION TO TRIGGER AUTO-TRADING
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_auto_trading()
RETURNS JSONB AS $$
DECLARE
  config RECORD;
  current_hour INTEGER;
  run_id UUID;
  result JSONB;
BEGIN
  -- Get configuration
  SELECT * INTO config FROM auto_trading_config LIMIT 1;

  -- Check if system is enabled
  IF NOT config.enabled THEN
    RETURN jsonb_build_object(
      'status', 'disabled',
      'message', 'Auto-trading system is disabled'
    );
  END IF;

  -- Check current UTC hour
  current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC')::INTEGER;

  -- Only trade during configured hours (default: London session 8-16 UTC)
  IF current_hour < config.trading_hours_start OR current_hour >= config.trading_hours_end THEN
    RETURN jsonb_build_object(
      'status', 'outside_hours',
      'message', format('Outside trading hours (%s-%s UTC). Current: %s UTC',
                       config.trading_hours_start, config.trading_hours_end, current_hour),
      'current_hour', current_hour
    );
  END IF;

  -- Check daily trade limit
  IF config.trades_today >= config.max_daily_trades THEN
    RETURN jsonb_build_object(
      'status', 'daily_limit_reached',
      'message', format('Daily trade limit reached: %s/%s', config.trades_today, config.max_daily_trades),
      'trades_today', config.trades_today
    );
  END IF;

  -- Check daily loss limit
  IF config.daily_pnl <= -config.max_daily_loss THEN
    RETURN jsonb_build_object(
      'status', 'daily_loss_limit',
      'message', format('Daily loss limit reached: $%.2f / -$%.2f', config.daily_pnl, config.max_daily_loss),
      'daily_pnl', config.daily_pnl
    );
  END IF;

  -- Generate unique run ID
  run_id := gen_random_uuid();

  -- Log start
  INSERT INTO auto_trading_log (run_id, status, mode, started_at)
  VALUES (run_id, 'started', config.mode, NOW());

  -- Call Edge Function via HTTP (requires pg_net extension)
  BEGIN
    result := net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/auto-oanda-trader',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'mode', config.mode,
        'durationMinutes', config.duration_minutes,
        'minIntervalSeconds', config.min_interval_seconds,
        'maxIntervalSeconds', config.max_interval_seconds,
        'minWeightThreshold', config.min_weight_threshold,
        'skipWeightFilter', config.skip_weight_filter
      )
    );

    -- Log completion
    UPDATE auto_trading_log
    SET
      status = 'completed',
      ended_at = NOW(),
      duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
    WHERE run_id = run_id;

    -- Update config
    UPDATE auto_trading_config
    SET
      last_run_at = NOW(),
      updated_at = NOW();

    RETURN jsonb_build_object(
      'status', 'success',
      'run_id', run_id,
      'result', result
    );

  EXCEPTION WHEN OTHERS THEN
    -- Log failure
    UPDATE auto_trading_log
    SET
      status = 'failed',
      error_message = SQLERRM,
      ended_at = NOW()
    WHERE run_id = run_id;

    RETURN jsonb_build_object(
      'status', 'error',
      'run_id', run_id,
      'error', SQLERRM
    );
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION trigger_auto_trading IS 'Triggers auto-trading session with weight filtering and safety checks';

-- ============================================================================
-- 4. CRON JOB SETUP (Conservative Schedule)
-- ============================================================================

-- Remove existing auto-trading cron jobs
SELECT cron.unschedule('auto-oanda-trader-london') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-oanda-trader-london'
);

-- Schedule auto-trading during London session (8-16 UTC)
-- Runs every hour during trading hours
-- Conservative: 1 session per hour, 2-hour duration, 20-30 min intervals
SELECT cron.schedule(
  'auto-oanda-trader-london',
  '0 8,10,12,14 * * 1-5',  -- 8 AM, 10 AM, 12 PM, 2 PM UTC, Mon-Fri only
  $$SELECT trigger_auto_trading()$$
);

COMMENT ON EXTENSION cron IS 'Auto-trading scheduled for London session (8-16 UTC), Mon-Fri only';

-- ============================================================================
-- 5. UTILITY FUNCTIONS
-- ============================================================================

-- Function to enable/disable auto-trading
CREATE OR REPLACE FUNCTION set_auto_trading_enabled(p_enabled BOOLEAN)
RETURNS TEXT AS $$
BEGIN
  UPDATE auto_trading_config SET enabled = p_enabled, updated_at = NOW();

  IF p_enabled THEN
    RETURN 'Auto-trading ENABLED (weight threshold: 70, max 10 trades/day)';
  ELSE
    RETURN 'Auto-trading DISABLED';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to reset daily counters (runs at midnight UTC)
CREATE OR REPLACE FUNCTION reset_daily_trading_counters()
RETURNS VOID AS $$
BEGIN
  UPDATE auto_trading_config
  SET
    trades_today = 0,
    daily_pnl = 0.00,
    updated_at = NOW();

  RAISE NOTICE 'Daily trading counters reset';
END;
$$ LANGUAGE plpgsql;

-- Schedule daily reset at midnight UTC
SELECT cron.unschedule('reset-daily-counters') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'reset-daily-counters'
);

SELECT cron.schedule(
  'reset-daily-counters',
  '0 0 * * *',  -- Midnight UTC
  $$SELECT reset_daily_trading_counters()$$
);

-- Function to get auto-trading status
CREATE OR REPLACE FUNCTION get_auto_trading_status()
RETURNS TABLE(
  enabled BOOLEAN,
  mode TEXT,
  weight_threshold DECIMAL,
  trades_today INTEGER,
  daily_pnl DECIMAL,
  last_run TEXT,
  next_run_hour INTEGER,
  trading_hours TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.enabled,
    c.mode,
    c.min_weight_threshold as weight_threshold,
    c.trades_today,
    c.daily_pnl,
    CASE
      WHEN c.last_run_at IS NOT NULL
      THEN to_char(c.last_run_at, 'YYYY-MM-DD HH24:MI:SS UTC')
      ELSE 'Never'
    END as last_run,
    CASE
      WHEN c.enabled AND EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC')::INTEGER < c.trading_hours_start
      THEN c.trading_hours_start
      WHEN c.enabled AND EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC')::INTEGER < c.trading_hours_end
      THEN (EXTRACT(HOUR FROM NOW() AT TIME ZONE 'UTC')::INTEGER / 2) * 2 + 2
      ELSE NULL
    END as next_run_hour,
    format('%s:00 - %s:00 UTC', c.trading_hours_start, c.trading_hours_end) as trading_hours
  FROM auto_trading_config c
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. MONITORING VIEW
-- ============================================================================

CREATE OR REPLACE VIEW auto_trading_dashboard AS
SELECT
  -- Configuration
  (SELECT enabled FROM auto_trading_config LIMIT 1) as system_enabled,
  (SELECT min_weight_threshold FROM auto_trading_config LIMIT 1) as weight_threshold,
  (SELECT trades_today FROM auto_trading_config LIMIT 1) as trades_today,
  (SELECT max_daily_trades FROM auto_trading_config LIMIT 1) as max_daily_trades,
  (SELECT daily_pnl FROM auto_trading_config LIMIT 1) as daily_pnl,

  -- Recent activity
  (SELECT COUNT(*) FROM auto_trading_log WHERE started_at > NOW() - INTERVAL '24 hours') as runs_last_24h,
  (SELECT COUNT(*) FROM auto_trading_log WHERE status = 'completed' AND started_at > NOW() - INTERVAL '24 hours') as successful_runs_24h,
  (SELECT COUNT(*) FROM auto_trading_log WHERE status = 'failed' AND started_at > NOW() - INTERVAL '24 hours') as failed_runs_24h,

  -- Signal performance
  (SELECT COUNT(*) FROM signal_performance WHERE signal_type = 'weighted' AND created_at > NOW() - INTERVAL '24 hours') as signals_last_24h,
  (SELECT COUNT(*) FROM signal_performance WHERE signal_type = 'weighted' AND signal_weight >= 70 AND created_at > NOW() - INTERVAL '24 hours') as high_weight_signals_24h,
  (SELECT AVG(signal_weight) FROM signal_performance WHERE signal_type = 'weighted' AND created_at > NOW() - INTERVAL '24 hours') as avg_weight_24h,

  -- Win rate
  (SELECT
    ROUND((COUNT(*) FILTER (WHERE win = true)::FLOAT / NULLIF(COUNT(*) FILTER (WHERE win IS NOT NULL), 0)) * 100, 1)
   FROM signal_performance
   WHERE signal_type = 'weighted' AND created_at > NOW() - INTERVAL '7 days'
  ) as win_rate_7d,

  -- Last run
  (SELECT to_char(started_at, 'YYYY-MM-DD HH24:MI UTC') FROM auto_trading_log ORDER BY started_at DESC LIMIT 1) as last_run;

COMMENT ON VIEW auto_trading_dashboard IS 'Real-time dashboard for auto-trading system with weight filtering';

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON auto_trading_dashboard TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_auto_trading_status TO authenticated, anon;
GRANT EXECUTE ON FUNCTION set_auto_trading_enabled TO service_role;
GRANT EXECUTE ON FUNCTION trigger_auto_trading TO service_role;

-- ============================================================================
-- FINAL STATUS
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=================================================================';
  RAISE NOTICE 'AUTO-TRADING SYSTEM V4 WITH WEIGHT FILTERING';
  RAISE NOTICE '=================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Status: INSTALLED (DISABLED by default for safety)';
  RAISE NOTICE '';
  RAISE NOTICE 'Configuration:';
  RAISE NOTICE '  - Weight Threshold: >= 70 (100%% win rate from backtest)';
  RAISE NOTICE '  - Trading Hours: 8-16 UTC (London session)';
  RAISE NOTICE '  - Schedule: Every 2 hours (8 AM, 10 AM, 12 PM, 2 PM)';
  RAISE NOTICE '  - Max Daily Trades: 10';
  RAISE NOTICE '  - Interval: 20-30 min random between trades';
  RAISE NOTICE '  - Position Sizing: 0.25x-2.0x based on weight';
  RAISE NOTICE '';
  RAISE NOTICE 'Safety Features:';
  RAISE NOTICE '  ✅ Only trades signals with weight >= 70';
  RAISE NOTICE '  ✅ Limited to London session (8-16 UTC)';
  RAISE NOTICE '  ✅ Max 10 trades per day';
  RAISE NOTICE '  ✅ Max $100 daily loss limit';
  RAISE NOTICE '  ✅ Weekdays only (Mon-Fri)';
  RAISE NOTICE '  ✅ All trades executed on OANDA demo account';
  RAISE NOTICE '';
  RAISE NOTICE 'To Enable:';
  RAISE NOTICE '  SELECT set_auto_trading_enabled(true);';
  RAISE NOTICE '';
  RAISE NOTICE 'To Check Status:';
  RAISE NOTICE '  SELECT * FROM get_auto_trading_status();';
  RAISE NOTICE '  SELECT * FROM auto_trading_dashboard;';
  RAISE NOTICE '';
  RAISE NOTICE '=================================================================';
END $$;
