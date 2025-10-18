-- First, find and remove all triggers on auth.users that might be causing issues
DROP TRIGGER IF EXISTS on_auth_user_created_welcome_email ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Now safely drop the function
DROP FUNCTION IF EXISTS public.trigger_welcome_email() CASCADE;

-- Also remove the old welcome email trigger function if it exists
DROP FUNCTION IF EXISTS public.handle_new_user_welcome() CASCADE;