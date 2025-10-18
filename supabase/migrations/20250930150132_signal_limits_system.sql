-- Signal Limits System Migration
-- Creates the complete signal tracking and limiting system

-- =============================================================================
-- 1. CREATE DAILY_SIGNAL_USAGE TABLE
-- =============================================================================

-- Create daily_signal_usage table
CREATE TABLE IF NOT EXISTS public.daily_signal_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    signals_used INTEGER NOT NULL DEFAULT 0,
    signals_limit INTEGER NOT NULL DEFAULT 1,
    subscription_tier TEXT NOT NULL DEFAULT 'essential',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one record per user per day
    UNIQUE(user_id, usage_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_signal_usage_user_id ON public.daily_signal_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_signal_usage_date ON public.daily_signal_usage(usage_date);
CREATE INDEX IF NOT EXISTS idx_daily_signal_usage_user_date ON public.daily_signal_usage(user_id, usage_date);

-- Add comments
COMMENT ON TABLE public.daily_signal_usage IS 'Tracks daily signal usage per user based on subscription tier';
COMMENT ON COLUMN public.daily_signal_usage.signals_used IS 'Number of signals used by the user on this date';
COMMENT ON COLUMN public.daily_signal_usage.signals_limit IS 'Daily signal limit based on subscription tier';
COMMENT ON COLUMN public.daily_signal_usage.subscription_tier IS 'Current subscription tier of the user';

-- =============================================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on the daily_signal_usage table
ALTER TABLE public.daily_signal_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own signal usage
CREATE POLICY "Users can view own signal usage" ON public.daily_signal_usage
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own signal usage records
CREATE POLICY "Users can insert own signal usage" ON public.daily_signal_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own signal usage records
CREATE POLICY "Users can update own signal usage" ON public.daily_signal_usage
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================================================
-- 3. CREATE HELPER FUNCTIONS
-- =============================================================================

-- Function to get signal limits based on subscription tier
CREATE OR REPLACE FUNCTION get_signal_limit(tier TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    signal_limit INTEGER;
BEGIN
    CASE tier
        WHEN 'essential' THEN
            signal_limit := 1;  -- 1 signal per day
        WHEN 'professional' THEN
            signal_limit := 999;  -- Effectively unlimited
        WHEN 'enterprise' THEN
            signal_limit := 9999;  -- Effectively unlimited
        ELSE
            signal_limit := 1;  -- Default to essential
    END CASE;

    RETURN signal_limit;
END;
$$;

-- =============================================================================
-- 4. CREATE CAN_GENERATE_SIGNAL FUNCTION
-- =============================================================================

-- Function to check if user can generate signals based on subscription
CREATE OR REPLACE FUNCTION can_generate_signal(user_uuid UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id UUID := COALESCE(user_uuid, auth.uid());
    usage_record RECORD;
    user_tier TEXT := 'essential';
    daily_limit INTEGER;
    remaining INTEGER;
    can_generate BOOLEAN := FALSE;
    reset_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Validate user
    IF target_user_id IS NULL THEN
        RETURN json_build_object(
            'can_generate', FALSE,
            'error', 'User not authenticated',
            'remaining', 0,
            'daily_limit', 0,
            'used_today', 0,
            'tier', 'none'
        );
    END IF;

    -- Get user's subscription tier from profiles
    SELECT COALESCE(subscription_tier, 'essential') INTO user_tier
    FROM public.profiles
    WHERE id = target_user_id;

    -- Get daily limit for the tier
    daily_limit := get_signal_limit(user_tier);

    -- Get or create today's usage record
    SELECT * INTO usage_record
    FROM public.daily_signal_usage
    WHERE user_id = target_user_id AND usage_date = CURRENT_DATE;

    -- If no record exists for today, create one
    IF usage_record IS NULL THEN
        INSERT INTO public.daily_signal_usage (
            user_id,
            usage_date,
            signals_used,
            signals_limit,
            subscription_tier
        ) VALUES (
            target_user_id,
            CURRENT_DATE,
            0,
            daily_limit,
            user_tier
        ) RETURNING * INTO usage_record;
    END IF;

    -- Calculate remaining signals
    remaining := daily_limit - usage_record.signals_used;
    can_generate := remaining > 0;

    -- Calculate reset time (next day at midnight UTC)
    reset_time := (CURRENT_DATE + INTERVAL '1 day')::timestamp with time zone;

    RETURN json_build_object(
        'can_generate', can_generate,
        'remaining', remaining,
        'daily_limit', daily_limit,
        'used_today', usage_record.signals_used,
        'tier', user_tier,
        'reset_time', reset_time,
        'error', NULL
    );
END;
$$;

-- =============================================================================
-- 5. CREATE INCREMENT_SIGNAL_USAGE FUNCTION
-- =============================================================================

-- Function to increment signal usage when a signal is generated
CREATE OR REPLACE FUNCTION increment_signal_usage(user_uuid UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id UUID := COALESCE(user_uuid, auth.uid());
    usage_record RECORD;
    user_tier TEXT := 'essential';
    daily_limit INTEGER;
    remaining INTEGER;
    success BOOLEAN := FALSE;
BEGIN
    -- Validate user
    IF target_user_id IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'User not authenticated',
            'remaining', 0,
            'daily_limit', 0,
            'used_today', 0
        );
    END IF;

    -- Get user's subscription tier
    SELECT COALESCE(subscription_tier, 'essential') INTO user_tier
    FROM public.profiles
    WHERE id = target_user_id;

    -- Get daily limit
    daily_limit := get_signal_limit(user_tier);

    -- Get or create today's usage record
    SELECT * INTO usage_record
    FROM public.daily_signal_usage
    WHERE user_id = target_user_id AND usage_date = CURRENT_DATE
    FOR UPDATE; -- Lock the record to prevent race conditions

    -- If no record exists, create one
    IF usage_record IS NULL THEN
        INSERT INTO public.daily_signal_usage (
            user_id,
            usage_date,
            signals_used,
            signals_limit,
            subscription_tier
        ) VALUES (
            target_user_id,
            CURRENT_DATE,
            0,
            daily_limit,
            user_tier
        ) RETURNING * INTO usage_record;
    END IF;

    -- Check if user can generate more signals
    remaining := daily_limit - usage_record.signals_used;

    IF remaining > 0 THEN
        -- Increment usage
        UPDATE public.daily_signal_usage
        SET
            signals_used = signals_used + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = usage_record.id;

        success := TRUE;
        remaining := remaining - 1;
    END IF;

    RETURN json_build_object(
        'success', success,
        'error', CASE WHEN success THEN NULL ELSE 'Daily signal limit exceeded' END,
        'remaining', remaining,
        'daily_limit', daily_limit,
        'used_today', usage_record.signals_used + CASE WHEN success THEN 1 ELSE 0 END,
        'tier', user_tier
    );
END;
$$;

-- =============================================================================
-- 6. CREATE GET_SIGNAL_USAGE FUNCTION
-- =============================================================================

-- Function to get current signal usage statistics
CREATE OR REPLACE FUNCTION get_signal_usage(user_uuid UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id UUID := COALESCE(user_uuid, auth.uid());
    usage_record RECORD;
    user_tier TEXT := 'essential';
    daily_limit INTEGER;
    remaining INTEGER;
    reset_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Validate user
    IF target_user_id IS NULL THEN
        RETURN json_build_object(
            'error', 'User not authenticated',
            'remaining', 0,
            'daily_limit', 0,
            'used_today', 0,
            'tier', 'none',
            'reset_time', NULL
        );
    END IF;

    -- Get user's subscription tier
    SELECT COALESCE(subscription_tier, 'essential') INTO user_tier
    FROM public.profiles
    WHERE id = target_user_id;

    -- Get daily limit
    daily_limit := get_signal_limit(user_tier);

    -- Get today's usage record
    SELECT * INTO usage_record
    FROM public.daily_signal_usage
    WHERE user_id = target_user_id AND usage_date = CURRENT_DATE;

    -- If no record exists, set defaults
    IF usage_record IS NULL THEN
        usage_record.signals_used := 0;
    END IF;

    -- Calculate remaining signals
    remaining := daily_limit - COALESCE(usage_record.signals_used, 0);

    -- Calculate reset time
    reset_time := (CURRENT_DATE + INTERVAL '1 day')::timestamp with time zone;

    RETURN json_build_object(
        'error', NULL,
        'remaining', remaining,
        'daily_limit', daily_limit,
        'used_today', COALESCE(usage_record.signals_used, 0),
        'tier', user_tier,
        'reset_time', reset_time,
        'can_generate', remaining > 0
    );
END;
$$;

-- =============================================================================
-- 7. CREATE UPDATE SUBSCRIPTION TIER TRIGGER
-- =============================================================================

-- Function to update signal usage when subscription tier changes
CREATE OR REPLACE FUNCTION update_subscription_tier_signal_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_limit INTEGER;
BEGIN
    -- Only proceed if subscription_tier has changed
    IF OLD.subscription_tier IS DISTINCT FROM NEW.subscription_tier THEN
        -- Get new signal limit
        new_limit := get_signal_limit(NEW.subscription_tier);

        -- Update today's usage record if it exists
        UPDATE public.daily_signal_usage
        SET
            signals_limit = new_limit,
            subscription_tier = NEW.subscription_tier,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = NEW.id AND usage_date = CURRENT_DATE;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS on_profile_update_subscription_tier ON public.profiles;
CREATE TRIGGER on_profile_update_subscription_tier
    AFTER UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_tier_signal_limits();

-- =============================================================================
-- 8. CREATE CLEANUP JOB FOR OLD RECORDS
-- =============================================================================

-- Function to clean up old signal usage records (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_signal_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.daily_signal_usage
    WHERE usage_date < CURRENT_DATE - INTERVAL '30 days';
END;
$$;

-- =============================================================================
-- 9. GRANT PERMISSIONS
-- =============================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.daily_signal_usage TO authenticated;
GRANT EXECUTE ON FUNCTION can_generate_signal(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_signal_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_signal_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_signal_limit(TEXT) TO authenticated;

-- Grant service role permissions for Edge Functions
GRANT ALL ON public.daily_signal_usage TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =============================================================================
-- 10. CREATE USAGE SUMMARY VIEW
-- =============================================================================

-- Create a view for usage analytics
CREATE OR REPLACE VIEW signal_usage_summary AS
SELECT
    dsu.usage_date,
    dsu.subscription_tier,
    COUNT(*) as active_users,
    SUM(dsu.signals_used) as total_signals_used,
    AVG(dsu.signals_used::float) as avg_signals_used,
    MAX(dsu.signals_used) as max_signals_used
FROM public.daily_signal_usage dsu
WHERE dsu.usage_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY dsu.usage_date, dsu.subscription_tier
ORDER BY dsu.usage_date DESC;

-- Grant access to the view
GRANT SELECT ON signal_usage_summary TO authenticated;
GRANT SELECT ON signal_usage_summary TO service_role;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Add final comment
COMMENT ON SCHEMA public IS 'Signal limits system migration completed - tracks daily signal usage per user based on subscription tier with proper RLS and automated cleanup.';