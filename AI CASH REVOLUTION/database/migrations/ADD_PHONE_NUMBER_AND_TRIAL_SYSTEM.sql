-- ========================================
-- ADD PHONE NUMBER AND ENHANCED TRIAL SYSTEM
-- ========================================
-- Esegui questo SQL nel Supabase SQL Editor
-- Dashboard > SQL Editor > New Query
-- ========================================

-- 1. Add phone_number column to profiles table (if not exists)
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20) UNIQUE;

-- 2. Add index for phone_number lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number
ON public.profiles(phone_number)
WHERE phone_number IS NOT NULL;

-- 3. Add comment for documentation
COMMENT ON COLUMN public.profiles.phone_number IS 'Unique phone number to prevent multiple trial accounts';

-- 4. Ensure trial_ends_at column exists (should already exist)
ALTER TABLE IF NOT EXISTS public.profiles
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- 5. Ensure subscription_status exists
ALTER TABLE IF NOT EXISTS public.profiles
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'trial';

-- 6. Add constraint to ensure phone number format (optional but recommended)
-- Format: +39 followed by 9-10 digits or any international format
ALTER TABLE IF EXISTS public.profiles
ADD CONSTRAINT IF NOT EXISTS phone_number_format
CHECK (phone_number IS NULL OR phone_number ~ '^\+?[1-9]\d{1,14}$');

-- 7. Create function to calculate remaining trial days
CREATE OR REPLACE FUNCTION get_trial_days_remaining(user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  trial_end TIMESTAMPTZ;
  days_remaining INTEGER;
BEGIN
  SELECT trial_ends_at INTO trial_end
  FROM public.profiles
  WHERE id = user_id_param;

  IF trial_end IS NULL THEN
    RETURN -1; -- No trial set
  END IF;

  days_remaining := EXTRACT(DAY FROM (trial_end - NOW()));

  IF days_remaining < 0 THEN
    RETURN 0; -- Trial expired
  END IF;

  RETURN days_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create function to check if phone number is already used
CREATE OR REPLACE FUNCTION is_phone_number_available(phone_param VARCHAR(20))
RETURNS BOOLEAN AS $$
DECLARE
  phone_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO phone_count
  FROM public.profiles
  WHERE phone_number = phone_param;

  RETURN phone_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Create view for trial monitoring (admin dashboard)
CREATE OR REPLACE VIEW trial_users_monitor AS
SELECT
  p.id,
  p.email,
  p.phone_number,
  p.subscription_status,
  p.trial_ends_at,
  p.created_at,
  CASE
    WHEN p.trial_ends_at IS NULL THEN NULL
    WHEN p.trial_ends_at < NOW() THEN 0
    ELSE EXTRACT(DAY FROM (p.trial_ends_at - NOW()))::INTEGER
  END AS days_remaining,
  CASE
    WHEN p.trial_ends_at IS NULL THEN 'NO_TRIAL'
    WHEN p.trial_ends_at < NOW() THEN 'EXPIRED'
    WHEN EXTRACT(DAY FROM (p.trial_ends_at - NOW())) <= 1 THEN 'EXPIRING_SOON'
    ELSE 'ACTIVE'
  END AS trial_status
FROM public.profiles p
WHERE p.subscription_status = 'trial' OR p.trial_ends_at IS NOT NULL
ORDER BY p.trial_ends_at ASC NULLS LAST;

-- 10. Grant necessary permissions
GRANT SELECT ON trial_users_monitor TO authenticated;
GRANT EXECUTE ON FUNCTION get_trial_days_remaining(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_phone_number_available(VARCHAR) TO authenticated;

-- ========================================
-- VERIFICATION QUERIES
-- Run these to verify the migration
-- ========================================

-- Check if phone_number column exists
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'profiles' AND column_name = 'phone_number';

-- Check uniqueness constraint
-- SELECT constraint_name, constraint_type
-- FROM information_schema.table_constraints
-- WHERE table_name = 'profiles' AND constraint_name LIKE '%phone%';

-- Test trial days function
-- SELECT get_trial_days_remaining(auth.uid());

-- View trial users
-- SELECT * FROM trial_users_monitor;
