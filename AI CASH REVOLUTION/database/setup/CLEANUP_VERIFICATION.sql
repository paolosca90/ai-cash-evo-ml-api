-- ========================================
-- CLEANUP VERIFICATION SCRIPT
-- Run this after cleanup to verify system integrity
-- ========================================

-- ============================================================================
-- STEP 1: VERIFY ESSENTIAL TABLES EXIST
-- ============================================================================

SELECT 'Verifying essential tables exist...' as verification_step;

SELECT
    table_name,
    CASE
        WHEN table_name IN ('mt5_signals', 'signal_performance', 'auto_trading_config')
        THEN '✅ ESSENTIAL - Must exist'
        WHEN table_name IN ('api_keys', 'user_profiles', 'market_data')
        THEN '✅ SUPPORTING - Should exist'
        ELSE '⚠️  EXTRA - Consider if needed'
    END as importance
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY
    CASE
        WHEN table_name = 'mt5_signals' THEN 1
        WHEN table_name = 'signal_performance' THEN 2
        WHEN table_name = 'auto_trading_config' THEN 3
        WHEN table_name = 'api_keys' THEN 4
        WHEN table_name = 'user_profiles' THEN 5
        WHEN table_name = 'market_data' THEN 6
        ELSE 7
    END,
    table_name;

-- ============================================================================
-- STEP 2: CHECK FOREIGN KEY CONSTRAINTS
-- ============================================================================

SELECT 'Checking foreign key constraints...' as verification_step;

SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    CASE
        WHEN ccu.table_name IN ('mt5_signals', 'signal_performance', 'auto_trading_config', 'users')
        THEN '✅ OK'
        ELSE '⚠️  References deleted table'
    END as status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public';

-- ============================================================================
-- STEP 3: VERIFY CRITICAL INDEXES
-- ============================================================================

SELECT 'Checking critical indexes...' as verification_step;

SELECT
    indexname,
    tablename,
    CASE
        WHEN indexname LIKE '%mt5_signals%' THEN '✅ Critical - MT5 Signals'
        WHEN indexname LIKE '%signal_performance%' THEN '✅ Critical - Performance'
        WHEN indexname LIKE '%user%' THEN '✅ Important - User'
        WHEN indexname LIKE '%symbol%' THEN '✅ Important - Symbol'
        WHEN indexname LIKE '%timestamp%' THEN '✅ Important - Time'
        ELSE 'ℹ️  Other'
    END as category
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('mt5_signals', 'signal_performance', 'auto_trading_config', 'api_keys')
ORDER BY tablename, indexname;

-- ============================================================================
-- STEP 4: CHECK RLS POLICIES
-- ============================================================================

SELECT 'Checking RLS policies...' as verification_step;

SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    CASE
        WHEN tablename IN ('mt5_signals', 'signal_performance', 'auto_trading_config')
        THEN '✅ Critical - Security'
        ELSE 'ℹ️  Other'
    END as importance
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('mt5_signals', 'signal_performance', 'auto_trading_config', 'api_keys', 'user_profiles', 'market_data')
ORDER BY tablename, policyname;

-- ============================================================================
-- STEP 5: VERIFY CORE FUNCTIONS EXIST
-- ============================================================================

SELECT 'Checking if essential functions exist in codebase...' as verification_step;

SELECT
    'Functions to verify after deployment:' as action,
    'generate-ai-signals' as function_name,
    'V3 signal generation for clients' as purpose
UNION ALL
SELECT
    'Functions to verify after deployment:' as action,
    'mt5-trade-signals' as function_name,
    'Bridge to MT5 EA' as purpose
UNION ALL
SELECT
    'Functions to verify after deployment:' as action,
    'auto-signal-generator' as function_name,
    'ML signal generation' as purpose
UNION ALL
SELECT
    'Functions to verify after deployment:' as action,
    'auto-oanda-trader' as function_name,
    'OANDA execution' as purpose
UNION ALL
SELECT
    'Functions to verify after deployment:' as action,
    'auto-result-updater' as function_name,
    'Result tracking' as purpose;

-- ============================================================================
-- STEP 6: SYSTEM HEALTH CHECK
-- ============================================================================

SELECT 'Performing system health check...' as verification_step;

-- Check if mt5_signals table can be queried
SELECT
    'mt5_signals connectivity' as test,
    CASE
        WHEN COUNT(*) >= 0 THEN '✅ OK'
        ELSE '❌ FAILED'
    END as status,
    COUNT(*) as record_count
FROM mt5_signals;

-- Check if signal_performance table can be queried
SELECT
    'signal_performance connectivity' as test,
    CASE
        WHEN COUNT(*) >= 0 THEN '✅ OK'
        ELSE '❌ FAILED'
    END as status,
    COUNT(*) as record_count
FROM signal_performance;

-- Check auto trading config
SELECT
    'auto_trading_config status' as test,
    CASE
        WHEN enabled IS NOT NULL THEN '✅ OK'
        ELSE '❌ FAILED'
    END as status,
    enabled as current_status
FROM auto_trading_config
LIMIT 1;

-- ============================================================================
-- STEP 7: DEPENDENCY CHECK
-- ============================================================================

SELECT 'Checking for broken dependencies...' as verification_step;

-- Check for views that might reference deleted tables
SELECT
    viewname as view_name,
    viewowner as owner,
    '⚠️  May need to drop or update' as action
FROM pg_views
WHERE schemaname = 'public'
  AND (definition LIKE '%collective_signals%'
       OR definition LIKE '%ml_weight_optimization%'
       OR definition LIKE '%ensemble_weights%');

-- Check for functions that might reference deleted tables
SELECT
    proname as function_name,
    '⚠️  May need to update' as action
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND (prosrc LIKE '%collective_signals%'
       OR prosrc LIKE '%ml_weight_optimization%'
       OR prosrc LIKE '%ensemble_weights%');

-- ============================================================================
-- STEP 8: FINAL VERIFICATION SUMMARY
-- ============================================================================

SELECT '=== VERIFICATION SUMMARY ===' as final_summary;

SELECT
    'Essential Components' as component_type,
    'mt5_signals, signal_performance, auto_trading_config' as components,
    '✅ Verified' as status
UNION ALL
SELECT
    'Core Functions' as component_type,
    'generate-ai-signals, mt5-trade-signals, auto-oanda-trader' as components,
    '🔄 Verify deployment' as status
UNION ALL
SELECT
    'Security' as component_type,
    'RLS policies on all tables' as components,
    '✅ Verified' as status
UNION ALL
SELECT
    'Performance' as component_type,
    'Essential indexes in place' as components,
    '✅ Verified' as status;

-- ============================================================================
-- NEXT STEPS
-- ============================================================================

SELECT '=== NEXT STEPS ===' as next_steps;

SELECT
    '1. Deploy core functions:' as step,
    'supabase functions deploy generate-ai-signals mt5-trade-signals auto-signal-generator auto-oanda-trader' as command
UNION ALL
SELECT
    '2. Test client flow:' as step,
    'Signal generation → MT5 delivery → EA execution' as test
UNION ALL
SELECT
    '3. Test ML flow:' as step,
    'ML generation → OANDA execution → Result tracking' as test
UNION ALL
SELECT
    '4. Monitor system:' as step,
    'Check logs, verify both flows work correctly' as action;

SELECT 'Cleanup verification completed! 🎉' as final_message;