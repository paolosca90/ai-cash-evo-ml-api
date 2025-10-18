-- Temporarily disable the trigger to allow user registration
-- We'll create a simpler, non-blocking approach

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create a much simpler trigger that just logs and never fails
CREATE OR REPLACE FUNCTION public.trigger_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Just log that a user was created, don't try to send email from trigger
  -- This prevents any blocking of user creation
  INSERT INTO public.email_logs (user_id, email_type, recipient, status)
  VALUES (NEW.id, 'welcome', NEW.email, 'pending')
  ON CONFLICT DO NOTHING;
  
  -- Always return NEW to ensure user creation succeeds
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Even if logging fails, don't block user creation
    RETURN NEW;
END;
$$;

-- Re-create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.trigger_welcome_email();