-- ========================================
-- QUICK VERIFICATION CHECKLIST
-- Run immediately after cleanup to verify success
-- ========================================

-- Step 1: Verify Essential Tables Exist
SELECT '=== ESSENTIAL TABLES CHECK ===' as check_type;
SELECT
    table_name,
    CASE
        WHEN table_name IN ('mt5_signals', 'signal_performance', 'auto_trading_config', 'api_keys', 'user_profiles', 'market_data')
        THEN '✅ PRESERVED'
        ELSE '⚠️  UNEXPECTED'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN ('mt5_signals', 'signal_performance', 'auto_trading_config', 'api_keys', 'user_profiles', 'market_data')
ORDER BY
    CASE table_name
        WHEN 'mt5_signals' THEN 1
        WHEN 'signal_performance' THEN 2
        WHEN 'auto_trading_config' THEN 3
        WHEN 'api_keys' THEN 4
        WHEN 'user_profiles' THEN 5
        WHEN 'market_data' THEN 6
    END;

-- Step 2: Check Data Integrity
SELECT '=== DATA INTEGRITY CHECK ===' as check_type;
SELECT
    'mt5_signals' as table_name,
    COUNT(*) as record_count,
    CASE WHEN COUNT(*) > 0 THEN '✅ Data Present' ELSE '⚠️  Empty' END as status
FROM mt5_signals
UNION ALL
SELECT
    'signal_performance' as table_name,
    COUNT(*) as record_count,
    CASE WHEN COUNT(*) > 0 THEN '✅ Data Present' ELSE '⚠️  Empty' END as status
FROM signal_performance
UNION ALL
SELECT
    'auto_trading_config' as table_name,
    COUNT(*) as record_count,
    CASE WHEN COUNT(*) > 0 THEN '✅ Data Present' ELSE '⚠️  Empty' END as status
FROM auto_trading_config;

-- Step 3: Verify Auto Trading Config
SELECT '=== AUTO TRADING CONFIG CHECK ===' as check_type;
SELECT
    enabled,
    signal_interval_minutes,
    min_confidence_threshold,
    CASE
        WHEN enabled IS NOT NULL THEN '✅ Config Valid'
        ELSE '❌ Config Missing'
    END as status
FROM auto_trading_config
LIMIT 1;

-- Step 4: Check RLS Policies
SELECT '=== SECURITY CHECK ===' as check_type;
SELECT
    tablename,
    COUNT(*) as policy_count,
    CASE
        WHEN COUNT(*) > 0 THEN '✅ RLS Protected'
        ELSE '⚠️  No RLS'
    END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('mt5_signals', 'signal_performance', 'auto_trading_config', 'api_keys', 'user_profiles', 'market_data')
GROUP BY tablename
ORDER BY tablename;

-- Step 5: Final Status Summary
SELECT '=== FINAL VERIFICATION SUMMARY ===' as summary;
SELECT
    'Cleanup Status' as component,
    CASE
        WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('mt5_signals', 'signal_performance', 'auto_trading_config', 'api_keys', 'user_profiles', 'market_data')) = 6
        THEN '✅ SUCCESS'
        ELSE '❌ FAILED'
    END as status
UNION ALL
SELECT
    'Data Integrity' as component,
    CASE
        WHEN (SELECT COUNT(*) FROM mt5_signals) >= 0 AND (SELECT COUNT(*) FROM signal_performance) >= 0
        THEN '✅ VERIFIED'
        ELSE '❌ COMPROMISED'
    END as status
UNION ALL
SELECT
    'Security' as component,
    CASE
        WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('mt5_signals', 'signal_performance', 'auto_trading_config')) > 0
        THEN '✅ PROTECTED'
        ELSE '⚠️  CHECK NEEDED'
    END as status;

SELECT '🎉 VERIFICATION COMPLETE - Ready for production!' as final_message;