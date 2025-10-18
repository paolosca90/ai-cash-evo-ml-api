-- Test script to verify MT5 Signals fix
-- Run this script to test the MT5 signals functionality after applying the fixes

-- 1. Test table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'mt5_signals' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Test if user_id column exists and is properly configured
SELECT
    'user_id column exists' as test,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'mt5_signals' AND column_name = 'user_id'
        ) THEN 'PASS'
        ELSE 'FAIL'
    END as status;

-- 3. Test if indexes exist
SELECT
    'Index test: idx_mt5_signals_user_id' as test,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'mt5_signals' AND indexname = 'idx_mt5_signals_user_id'
        ) THEN 'PASS'
        ELSE 'FAIL'
    END as status

UNION ALL

SELECT
    'Index test: idx_mt5_signals_status' as test,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'mt5_signals' AND indexname = 'idx_mt5_signals_status'
        ) THEN 'PASS'
        ELSE 'FAIL'
    END as status;

-- 4. Test validate_email_api_key function
SELECT
    'Function test: validate_email_api_key' as test,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines
            WHERE routine_name = 'validate_email_api_key'
        ) THEN 'PASS'
        ELSE 'FAIL'
    END as status;

-- 5. Test trigger exists
SELECT
    'Trigger test: sync_mt5_signals_user_id_trigger' as test,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.triggers
            WHERE trigger_name = 'sync_mt5_signals_user_id_trigger'
        ) THEN 'PASS'
        ELSE 'FAIL'
    END as status;

-- 6. Test if we can insert a sample signal (this will be rolled back)
BEGIN;

    -- Insert test user first (if not exists)
    INSERT INTO public.profiles (id, email, updated_at)
    VALUES (gen_random_uuid(), 'test@example.com', NOW())
    ON CONFLICT DO NOTHING;

    -- Get test user ID
    SELECT id INTO @test_user_id FROM public.profiles WHERE email = 'test@example.com' LIMIT 1;

    -- Test insert signal
    INSERT INTO public.mt5_signals (
        client_id, user_id, symbol, signal, entry, stop_loss, take_profit,
        confidence, risk_amount, timestamp, sent, status
    ) VALUES (
        'test@example.com',
        @test_user_id,
        'EURUSD',
        'BUY',
        1.1330,
        1.1305,
        1.1380,
        92.0,
        100.0,
        NOW(),
        false,
        'pending'
    );

    -- Test select the signal
    SELECT
        'Insert/Select test' as test,
        CASE
            WHEN COUNT(*) > 0 THEN 'PASS'
            ELSE 'FAIL'
        END as status,
        COUNT(*) as signal_count
    FROM public.mt5_signals
    WHERE symbol = 'EURUSD' AND client_id = 'test@example.com';

ROLLBACK;

-- 7. Test migration logs table
SELECT
    'Migration logs table exists' as test,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'migration_logs'
        ) THEN 'PASS'
        ELSE 'FAIL'
    END as status;

-- 8. Summary report
SELECT '=== MT5 SIGNALS FIX VERIFICATION SUMMARY ===' as report;
SELECT 'Run the above queries and verify all tests show PASS status' as instructions;
SELECT 'If any test shows FAIL, check the corresponding migration or configuration' as troubleshooting;