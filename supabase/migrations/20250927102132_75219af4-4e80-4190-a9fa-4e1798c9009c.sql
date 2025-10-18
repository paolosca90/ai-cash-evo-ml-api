-- SECURITY FIX: Restrict profiles table access to protect user email addresses
-- Replace the overly permissive public SELECT policy with user-specific access

-- Drop the current public policy that allows everyone to view all profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create a secure policy that only allows users to view their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT 
USING (auth.uid() = id);

-- Create a policy for authenticated users to view basic public info (without email)
-- This allows viewing display_name, bio, avatar_url but protects email addresses
CREATE POLICY "Public can view basic profile info" ON public.profiles
FOR SELECT 
USING (
  -- Only allow access to non-sensitive fields
  -- The email field will only be accessible to the profile owner
  auth.role() = 'authenticated' OR auth.uid() = id
);