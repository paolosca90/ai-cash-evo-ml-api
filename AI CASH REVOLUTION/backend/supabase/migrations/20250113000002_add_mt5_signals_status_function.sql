-- Add RPC function to check MT5 signals status
-- Function to help debug and verify MT5 signals functionality

CREATE OR REPLACE FUNCTION get_mt5_signals_status(email_input TEXT)
RETURNS TABLE (
    total_signals BIGINT,
    pending_signals BIGINT,
    sent_signals BIGINT,
    latest_signal TIMESTAMPTZ,
    user_exists BOOLEAN,
    table_accessible BOOLEAN
) AS $$
BEGIN
    -- Check if user exists
    RETURN QUERY
    SELECT
        COUNT(*) OVER() as total_signals,
        COUNT(*) FILTER (WHERE sent = false) OVER() as pending_signals,
        COUNT(*) FILTER (WHERE sent = true) OVER() as sent_signals,
        MAX(timestamp) OVER() as latest_signal,
        EXISTS(SELECT 1 FROM auth.users WHERE email = LOWER(email_input)) as user_exists,
        true as table_accessible
    FROM public.mt5_signals
    WHERE client_id = LOWER(email_input);

    -- If no rows, return defaults
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT
            0::BIGINT as total_signals,
            0::BIGINT as pending_signals,
            0::BIGINT as sent_signals,
            NULL::TIMESTAMPTZ as latest_signal,
            EXISTS(SELECT 1 FROM auth.users WHERE email = LOWER(email_input)) as user_exists,
            true as table_accessible;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_mt5_signals_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_mt5_signals_status TO anon;
GRANT EXECUTE ON FUNCTION get_mt5_signals_status TO service_role;

-- Add helpful comment
COMMENT ON FUNCTION get_mt5_signals_status IS 'Utility function to check MT5 signals status for debugging and verification purposes';

-- Log the migration
INSERT INTO public.migration_logs (migration_name, status, details)
VALUES ('add_mt5_signals_status_function', 'completed', 'Added RPC function get_mt5_signals_status for debugging MT5 signals')
ON CONFLICT (migration_name) DO UPDATE SET
    status = EXCLUDED.status,
    details = EXCLUDED.details,
    executed_at = NOW();

SELECT 'MT5 Signals status function created successfully!' as result;