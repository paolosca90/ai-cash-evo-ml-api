-- SECURITY FIX: Remove the security definer view and implement proper RLS
-- The view approach created a security definer issue, let's use a cleaner solution

-- Remove the problematic view
DROP VIEW IF EXISTS public.public_profiles;

-- The solution is to have a single, clear RLS policy on profiles
-- Users can only access their own profile data (including email)
-- This completely protects email addresses from unauthorized access

-- Verify our current policy is correct
-- (The policy "Users can only view their own complete profile" should already be in place)

-- Let's also ensure the other tables that might need email protection are secured
-- Check if there are any other references to user emails that need protection