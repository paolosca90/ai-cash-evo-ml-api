-- =====================================================
-- FIX SENT FIELD TRIGGER - SUPABASE SQL SCRIPT
-- =====================================================
-- Run this script in Supabase Dashboard → Database → SQL Editor
-- =====================================================

-- Step 1: Check current signals
SELECT 'Current signals (last 5):' as info;
SELECT
    id,
    client_id,
    symbol,
    signal,
    sent,
    processed,
    created_at,
    age(created_at) as age
FROM mt5_signals
ORDER BY created_at DESC
LIMIT 5;

-- Step 2: List all triggers on mt5_signals table
SELECT 'Triggers on mt5_signals table:' as info;
SELECT
    t.tgname as trigger_name,
    c.relname as table_name,
    p.proname as function_name,
    t.tgenabled as is_enabled,
    CASE t.tgenabled
        WHEN 'O' THEN 'ENABLED'
        WHEN 'D' THEN 'DISABLED'
        ELSE 'UNKNOWN'
    END as status,
    pg_get_triggerdef(t.oid) as trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'mt5_signals'
AND NOT t.tgisinternal
ORDER BY t.tgname;

-- Step 3: List all RLS policies on mt5_signals table
SELECT 'RLS policies on mt5_signals table:' as info;
SELECT
    pol.policyname,
    pol.permissive,
    pol.roles,
    pol.cmd,
    pol.qual as using_clause,
    pol.with_check as check_clause
FROM pg_policies pol
WHERE pol.tablename = 'mt5_signals'
ORDER BY pol.policyname;

-- Step 4: Get detailed function definitions for any triggers found
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN
        SELECT
            t.tgname as trigger_name,
            p.proname as function_name,
            p.oid as proc_oid
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE c.relname = 'mt5_signals'
        AND NOT t.tgisinternal
    LOOP
        RAISE NOTICE 'Function definition for trigger: %', trigger_record.trigger_name;
        RAISE NOTICE 'Function: %', trigger_record.function_name;
        RAISE NOTICE 'Definition: %', pg_get_functiondef(trigger_record.proc_oid);
        RAISE NOTICE '----------------------------------------';
    END LOOP;
END $$;

-- =====================================================
-- FIX ACTIONS - Uncomment and run as needed
-- =====================================================

-- Option A: Disable specific trigger (RECOMMENDED FIRST)
-- Replace 'trigger_name' with actual trigger name found above

-- ALTER TABLE mt5_signals DISABLE TRIGGER trigger_name;

-- Option B: Disable ALL triggers on mt5_signals (EMERGENCY)

-- ALTER TABLE mt5_signals DISABLE TRIGGER ALL;

-- Option C: Drop specific trigger (PERMANENT)

-- DROP TRIGGER IF EXISTS trigger_name ON mt5_signals;

-- Option D: Drop trigger function (if no longer needed)

-- DROP FUNCTION IF EXISTS function_name();

-- =====================================================
-- VERIFICATION TESTS
-- =====================================================

-- Test 1: Create test signal with sent=false
SELECT 'Creating test signal...' as info;

INSERT INTO mt5_signals (
    client_id,
    user_id,
    symbol,
    signal,
    confidence,
    entry,
    stop_loss,
    take_profit,
    risk_amount,
    timestamp,
    ai_analysis,
    sent,
    processed,
    status,
    created_at,
    eurusd_rate
) VALUES (
    'trigger_fix_test@example.com',
    '00000000-0000-0000-0000-000000000000',
    'EURUSD',
    'BUY',
    90,
    1.0850,
    1.0800,
    1.0900,
    100,
    NOW(),
    'Test signal after trigger fix - ' || NOW(),
    false,  -- This should stay false
    false,
    'pending',
    NOW(),
    1.0850
) RETURNING id, sent, processed, created_at;

-- Test 2: Wait 3 seconds and check if sent changed
-- (Run this query separately after 3 seconds)

SELECT 'Checking test signal after 3 seconds...' as info;

SELECT
    id,
    sent,
    processed,
    created_at,
    age(created_at) as age,
    ai_analysis
FROM mt5_signals
WHERE client_id = 'trigger_fix_test@example.com'
ORDER BY created_at DESC
LIMIT 1;

-- =====================================================
-- ALTERNATIVE SOLUTIONS (if trigger cannot be fixed)
-- =====================================================

-- Option A: Add new column for EA communication
-- Uncomment if needed

-- ALTER TABLE mt5_signals ADD COLUMN sent_to_ea BOOLEAN DEFAULT false;

-- Option B: Create index for performance (if using new column)
-- CREATE INDEX idx_mt5_signals_sent_to_ea ON mt5_signals(sent_to_ea) WHERE sent_to_ea = false;

-- =====================================================
-- CLEANUP TEST DATA (after verification)
-- =====================================================

-- Clean up test signal
-- DELETE FROM mt5_signals WHERE client_id = 'trigger_fix_test@example.com';

-- =====================================================
-- MONITORING QUERIES
-- =====================================================

-- Monitor signals being created in real-time
SELECT 'Recent signal activity (last 10 minutes):' as info;

SELECT
    id,
    client_id,
    symbol,
    signal,
    sent,
    processed,
    created_at,
    age(created_at) as age
FROM mt5_signals
WHERE created_at > NOW() - INTERVAL '10 minutes'
ORDER BY created_at DESC;

-- Check for any signals with sent=true that were recently created
SELECT 'Recently created signals with sent=true (potential issue):' as info;

SELECT
    id,
    client_id,
    symbol,
    signal,
    sent,
    processed,
    created_at,
    age(created_at) as age,
    ai_analysis
FROM mt5_signals
WHERE sent = true
AND created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;

-- =====================================================
-- SUMMARY
-- =====================================================

SELECT 'Trigger fix investigation completed!' as info;
SELECT 'Next steps:' as step1;
SELECT '1. Review trigger and policy results above' as step2;
SELECT '2. Apply appropriate fix (disable/drop trigger)' as step3;
SELECT '3. Run verification tests' as step4;
SELECT '4. Test with MT5 EA' as step5;
SELECT '5. Monitor production signals' as step6;