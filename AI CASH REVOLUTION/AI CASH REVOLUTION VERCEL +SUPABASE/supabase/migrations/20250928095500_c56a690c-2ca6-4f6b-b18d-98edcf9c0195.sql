-- Fix the trigger to not block user creation if email fails
-- Make the trigger more resilient and asynchronous

CREATE OR REPLACE FUNCTION public.trigger_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Don't block user creation if email fails
  -- Just log the trigger and let the user be created successfully
  INSERT INTO public.email_logs (user_id, email_type, recipient, status)
  VALUES (NEW.id, 'welcome', NEW.email, 'triggered')
  ON CONFLICT DO NOTHING;

  -- Use pg_background to send email asynchronously (if available)
  -- Otherwise, just log and let an external process handle it
  BEGIN
    -- Try to send email asynchronously
    PERFORM net.http_post(
      url => 'https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/welcome-email',
      headers => '{"Content-Type": "application/json"}'::jsonb,
      body => json_build_object(
        'user_id', NEW.id,
        'email', NEW.email,
        'name', COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', '')
      )::text
    );
    
    -- Update status to sent if successful
    UPDATE public.email_logs 
    SET status = 'sent'
    WHERE user_id = NEW.id AND email_type = 'welcome' AND status = 'triggered';
    
  EXCEPTION
    WHEN OTHERS THEN
      -- If email fails, just log it but don't block user creation
      UPDATE public.email_logs 
      SET status = 'failed', error_message = SQLERRM
      WHERE user_id = NEW.id AND email_type = 'welcome' AND status = 'triggered';
  END;

  -- Always return NEW to allow user creation to proceed
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.trigger_welcome_email();