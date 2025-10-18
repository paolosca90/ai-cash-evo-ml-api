-- SECURITY FIX: Correct the profiles table RLS policy approach
-- The previous approach had overlapping policies. Let's fix this properly.

-- Remove the problematic policies and create a clean, secure approach
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public can view basic profile info" ON public.profiles;

-- Create the correct policy: only authenticated users can view profiles, 
-- but they can only see their own email address
CREATE POLICY "Authenticated users can view profiles" ON public.profiles
FOR SELECT 
TO authenticated
USING (true);

-- However, to truly protect email addresses, we need a different approach
-- Let's create a view for public profile data that excludes emails
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  display_name,
  bio,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Now update the main profiles policy to be more restrictive
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Only allow users to see their own complete profile (including email)
CREATE POLICY "Users can only view their own complete profile" ON public.profiles
FOR SELECT 
TO authenticated
USING (auth.uid() = id);