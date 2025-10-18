-- ========================================
-- SYSTEM CLEANUP - Remove Redundant Components
-- Execute in Supabase SQL Editor
-- ========================================

-- ============================================================================
-- STEP 1: DELETE REDUNDANT EDGE FUNCTIONS
-- ============================================================================

-- Test and Signal Generation Variants (keeping only main generate-ai-signals)
SELECT 'Deleting redundant signal generation functions...' as status;

-- ML Training and Optimization Functions
SELECT 'Functions to delete manually via CLI:' as functions_to_delete;
SELECT ' - advanced-ml-signals' as function_name;
SELECT ' - generate-ml-signals' as function_name;
SELECT ' - synthetic-signal-generator' as function_name;
SELECT ' - random-signal-scheduler' as function_name;
SELECT ' - generate-ai-signals-fast' as function_name;
SELECT ' - generate-ai-signals-test' as function_name;
SELECT ' - generate-ai-signals-simple' as function_name;
SELECT ' - generate-ai-signals-public' as function_name;
SELECT ' - generate-ai-signals-v2' as function_name;
SELECT ' - generate-ai-signals-v3' as function_name;

-- ML Optimization Functions
SELECT ' - ml-weight-optimizer' as function_name;
SELECT ' - ml-signal-optimizer' as function_name;
SELECT ' - ml-performance-tracker' as function_name;
SELECT ' - ml-auto-retrain' as function_name;
SELECT ' - ml-historical-training' as function_name;
SELECT ' - ml-advanced-neural' as function_name;
SELECT ' - ml-validate' as function_name;
SELECT ' - ml-trading-optimizer' as function_name;

-- Data Feed Functions
SELECT ' - tradingview-market-data' as function_name;
SELECT ' - fetch-financial-news' as function_name;
SELECT ' - fetch-economic-calendar' as function_name;
SELECT ' - update-economic-calendar' as function_name;
SELECT ' - fetch-investing-news-it' as function_name;

-- Debug and Monitoring Functions
SELECT ' - debug-mt5-signals' as function_name;
SELECT ' - reset-mt5-signals' as function_name;
SELECT ' - cleanup-old-signals' as function_name;
SELECT ' - cleanup-null-entries' as function_name;
SELECT ' - signal-tick-monitor' as function_name;
SELECT ' - price-tick-cron' as function_name;
SELECT ' - historical-data-cache' as function_name;

-- Trading Optimization Functions
SELECT ' - trading-auto-optimizer' as function_name;
SELECT ' - trade-optimization-trigger' as function_name;

-- Research Functions
SELECT ' - finrl-deepseek-relay' as function_name;
SELECT ' - rl-inference' as function_name;
SELECT ' - llm-sentiment' as function_name;
SELECT ' - get-real-indicators' as function_name;

-- Webhook Functions
SELECT ' - realtime-trade-webhook' as function_name;

-- Payment Functions (if not needed)
SELECT ' - create-stripe-setup' as function_name;
SELECT ' - customer-portal' as function_name;
SELECT ' - check-subscription' as function_name;
SELECT ' - verify-crypto-payment' as function_name;
SELECT ' - create-payment-qr' as function_name;
SELECT ' - crypto-renewal-reminder' as function_name;
SELECT ' - create-checkout' as function_name;

-- ============================================================================
-- STEP 2: DELETE REDUNDANT DATABASE TABLES
-- ============================================================================

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

SELECT 'Starting table cleanup...' as status;

-- Research and ML Tables (unused)
DROP TABLE IF EXISTS collective_signals CASCADE;
DROP TABLE IF EXISTS ml_weight_optimization CASCADE;
DROP TABLE IF EXISTS ml_training_log CASCADE;
DROP TABLE IF EXISTS ensemble_weights CASCADE;
DROP TABLE IF EXISTS signal_generation_schedule CASCADE;

-- MT5 Infrastructure Tables (unused - we use email-based system)
DROP TABLE IF EXISTS mt5_accounts CASCADE;
DROP TABLE IF EXISTS mt5_connections CASCADE;
DROP TABLE IF EXISTS mt5_positions CASCADE;
DROP TABLE IF EXISTS mt5_orders CASCADE;
DROP TABLE IF EXISTS trade_signals CASCADE;
DROP TABLE IF EXISTS trade_log CASCADE;
DROP TABLE IF EXISTS batch_log CASCADE;

-- Statistics and Monitoring Tables (can calculate on demand)
DROP TABLE IF EXISTS user_statistics CASCADE;
DROP TABLE IF EXISTS risk_management_settings CASCADE;
DROP TABLE IF EXISTS error_log CASCADE;
DROP TABLE IF EXISTS performance_metrics CASCADE;
DROP TABLE IF EXISTS system_health CASCADE;

-- Configuration Tables (unused)
DROP TABLE IF EXISTS webhook_configurations CASCADE;
DROP TABLE IF EXISTS trading_sessions CASCADE;

-- Historical Data Tables (use external API)
DROP TABLE IF EXISTS historical_market_data CASCADE;
DROP TABLE IF EXISTS ml_historical_data CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- ============================================================================
-- STEP 3: CLEAN UP VIEWS AND FUNCTIONS
-- ============================================================================

SELECT 'Cleaning up views and functions...' as status;

-- Drop ensemble dashboard views (simplify system)
DROP VIEW IF EXISTS ensemble_performance_overview CASCADE;
DROP VIEW IF EXISTS symbol_performance_detail CASCADE;
DROP VIEW IF EXISTS context_performance_matrix CASCADE;
DROP VIEW IF EXISTS ensemble_weights_status CASCADE;
DROP VIEW IF EXISTS confidence_calibration CASCADE;
DROP VIEW IF EXISTS recent_signals_detail CASCADE;
DROP VIEW IF EXISTS ml_validation_effectiveness CASCADE;
DROP VIEW IF EXISTS temporal_performance CASCADE;
DROP VIEW IF EXISTS pnl_drawdown_analysis CASCADE;
DROP VIEW IF EXISTS auto_trading_system_health CASCADE;

-- Drop complex functions (keep simple ones)
DROP FUNCTION IF EXISTS get_ensemble_dashboard_summary CASCADE;
DROP FUNCTION IF EXISTS get_optimal_stop_loss CASCADE;
DROP FUNCTION IF EXISTS update_signal_tick CASCADE;
DROP FUNCTION IF EXISTS trigger_signal_generation CASCADE;
DROP FUNCTION IF EXISTS trigger_result_update CASCADE;
DROP FUNCTION IF EXISTS schedule_next_signal_generation CASCADE;
DROP FUNCTION IF EXISTS set_auto_trading_status CASCADE;
DROP FUNCTION IF EXISTS get_auto_trading_stats CASCADE;

-- ============================================================================
-- STEP 4: REMOVE CRON JOBS
-- ============================================================================

SELECT 'Removing cron jobs...' as status;

-- Remove auto trading cron jobs
SELECT cron.unschedule('auto-signal-generation') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-signal-generation'
);

SELECT cron.unschedule('auto-result-update') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'auto-result-update'
);

-- ============================================================================
-- STEP 5: SIMPLIFIED AUTO TRADING CONFIG
-- ============================================================================

-- Create simple auto trading config table (if not exists)
CREATE TABLE IF NOT EXISTS auto_trading_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN DEFAULT false,
  last_signal_time TIMESTAMPTZ,
  signal_interval_minutes INTEGER DEFAULT 30,
  max_daily_signals INTEGER DEFAULT 10,
  min_confidence_threshold INTEGER DEFAULT 70,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config
INSERT INTO auto_trading_config (enabled) VALUES (false)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE auto_trading_config ENABLE ROW LEVEL SECURITY;

-- Only service role can modify
CREATE POLICY "Service role full access" ON auto_trading_config
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Everyone can read config
CREATE POLICY "Everyone can read config" ON auto_trading_config
  FOR SELECT USING (true);

-- ============================================================================
-- STEP 6: CLEAN UP MIGRATIONS
-- ============================================================================

SELECT 'Cleanup completed!' as final_status;
SELECT 'Remaining core tables:' as summary;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN ('mt5_signals', 'signal_performance', 'auto_trading_config', 'api_keys', 'user_profiles', 'market_data', 'oanda_accounts')
ORDER BY table_name;

-- ============================================================================
-- CLI COMMANDS TO EXECUTE AFTER SQL CLEANUP:
-- ============================================================================

/*
Run these commands in your terminal after the SQL cleanup:

# Delete redundant Edge Functions
supabase functions delete advanced-ml-signals
supabase functions delete generate-ml-signals
supabase functions delete synthetic-signal-generator
supabase functions delete random-signal-scheduler
supabase functions delete generate-ai-signals-fast
supabase functions delete generate-ai-signals-test
supabase functions delete generate-ai-signals-simple
supabase functions delete generate-ai-signals-public
supabase functions delete generate-ai-signals-v2
supabase functions delete generate-ai-signals-v3
supabase functions delete ml-weight-optimizer
supabase functions delete ml-signal-optimizer
supabase functions delete ml-performance-tracker
supabase functions delete ml-auto-retrain
supabase functions delete ml-historical-training
supabase functions delete ml-advanced-neural
supabase functions delete ml-validate
supabase functions delete ml-trading-optimizer
supabase functions delete tradingview-market-data
supabase functions delete fetch-financial-news
supabase functions delete fetch-economic-calendar
supabase functions delete update-economic-calendar
supabase functions delete fetch-investing-news-it
supabase functions delete debug-mt5-signals
supabase functions delete reset-mt5-signals
supabase functions delete cleanup-old-signals
supabase functions delete cleanup-null-entries
supabase functions delete signal-tick-monitor
supabase functions delete price-tick-cron
supabase functions delete historical-data-cache
supabase functions delete trading-auto-optimizer
supabase functions delete trade-optimization-trigger
supabase functions delete finrl-deepseek-relay
supabase functions delete rl-inference
supabase functions delete llm-sentiment
supabase functions delete get-real-indicators
supabase functions delete realtime-trade-webhook

# Payment functions (if not needed)
supabase functions delete create-stripe-setup
supabase functions delete customer-portal
supabase functions delete check-subscription
supabase functions delete verify-crypto-payment
supabase functions delete create-payment-qr
supabase functions delete crypto-renewal-reminder
supabase functions delete create-checkout

# Redeploy core functions
supabase functions deploy generate-ai-signals
supabase functions deploy mt5-trade-signals
supabase functions deploy auto-signal-generator
supabase functions deploy auto-oanda-trader
supabase functions deploy auto-result-updater
supabase functions deploy user-api-keys
supabase functions deploy auth-email-handler
supabase functions deploy welcome-email
supabase functions deploy password-reset-email
supabase functions deploy send-reset-email
supabase functions deploy send-auth-email

# Verify remaining functions
supabase functions list
*/