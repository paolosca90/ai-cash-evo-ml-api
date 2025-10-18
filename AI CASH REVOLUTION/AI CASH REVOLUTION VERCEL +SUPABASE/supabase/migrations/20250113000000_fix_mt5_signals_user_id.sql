-- Fix MT5 Signals Table - Add user_id column and fix field mappings
-- Migration script to resolve the 500 error in mt5-trade-signals Edge Function

-- Step 1: Add missing user_id column to mt5_signals table
ALTER TABLE public.mt5_signals
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Add missing status column for better signal tracking
ALTER TABLE public.mt5_signals
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
CHECK (status IN ('pending', 'sent', 'executed', 'opened', 'closed', 'failed', 'cancelled'));

-- Step 3: Add missing columns for enhanced tracking
ALTER TABLE public.mt5_signals
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS actual_profit DECIMAL(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS entry_price DECIMAL(15,5),
ADD COLUMN IF NOT EXISTS exit_price DECIMAL(15,5);

-- Step 4: Fix field name inconsistencies - Add alias columns for compatibility
ALTER TABLE public.mt5_signals
ADD COLUMN IF NOT EXISTS action VARCHAR(10) GENERATED ALWAYS AS (signal) STORED;

-- Step 5: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_mt5_signals_user_id ON public.mt5_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_mt5_signals_status ON public.mt5_signals(status);
CREATE INDEX IF NOT EXISTS idx_mt5_signals_symbol_status ON public.mt5_signals(symbol, status);
CREATE INDEX IF NOT EXISTS idx_mt5_signals_timestamp_user ON public.mt5_signals(timestamp DESC, user_id);

-- Step 6: Update existing records to have default status
UPDATE public.mt5_signals
SET status = CASE
    WHEN sent = true THEN 'sent'
    ELSE 'pending'
END
WHERE status IS NULL;

-- Step 7: Create trigger to automatically set user_id from client_id (temporary fix)
CREATE OR REPLACE FUNCTION sync_mt5_signals_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If user_id is NULL, try to get it from profiles using client_id as email
    IF NEW.user_id IS NULL AND NEW.client_id IS NOT NULL THEN
        SELECT id INTO NEW.user_id
        FROM public.profiles
        WHERE LOWER(email) = LOWER(NEW.client_id)
        LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_mt5_signals_user_id_trigger ON public.mt5_signals;

-- Create trigger
CREATE TRIGGER sync_mt5_signals_user_id_trigger
    BEFORE INSERT OR UPDATE ON public.mt5_signals
    FOR EACH ROW EXECUTE FUNCTION sync_mt5_signals_user_id();

-- Step 8: Grant necessary permissions to service role
GRANT ALL ON public.mt5_signals TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Step 9: Add helpful comments
COMMENT ON COLUMN public.mt5_signals.user_id IS 'User ID from auth.users - links signal to specific user';
COMMENT ON COLUMN public.mt5_signals.status IS 'Signal status: pending, sent, executed, opened, closed, failed, cancelled';
COMMENT ON COLUMN public.mt5_signals.opened_at IS 'When the trade was opened/executed';
COMMENT ON COLUMN public.mt5_signals.closed_at IS 'When the trade was closed';
COMMENT ON COLUMN public.mt5_signals.actual_profit IS 'Actual profit/loss from closed trade';
COMMENT ON COLUMN public.mt5_signals.entry_price IS 'Actual entry price from execution';
COMMENT ON COLUMN public.mt5_signals.exit_price IS 'Actual exit price from execution';

-- Step 10: Log the migration
INSERT INTO public.migration_logs (migration_name, status, details)
VALUES ('fix_mt5_signals_user_id', 'completed', 'Added user_id column and fixed field mappings for mt5-trade-signals Edge Function')
ON CONFLICT (migration_name) DO UPDATE SET
    status = EXCLUDED.status,
    details = EXCLUDED.details,
    executed_at = NOW();

SELECT 'MT5 Signals table fix completed successfully!' as result;