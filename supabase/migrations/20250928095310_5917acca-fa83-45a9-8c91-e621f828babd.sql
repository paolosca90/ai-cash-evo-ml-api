-- Fix pg_net installation and welcome trigger headers

-- 1) If pg_net exists, drop it so we can reinstall cleanly
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    EXECUTE 'DROP EXTENSION pg_net';
  END IF;
END$$;

-- 2) Install pg_net (it will create the required schema and functions)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3) Update trigger function to use jsonb headers and no Authorization header
CREATE OR REPLACE FUNCTION public.trigger_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
  headers_json jsonb;
  body_text text;
BEGIN
  headers_json := '{"Content-Type": "application/json"}'::jsonb;

  body_text := json_build_object(
    'user_id', NEW.id,
    'email', NEW.email,
    'name', COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', '')
  )::text;

  SELECT net.http_post(
    url => 'https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/welcome-email',
    headers => headers_json,
    body => body_text
  ) INTO request_id;

  INSERT INTO public.email_logs (user_id, email_type, recipient, status)
  VALUES (NEW.id, 'welcome', NEW.email, 'triggered')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO public.email_logs (user_id, email_type, recipient, status, error_message)
    VALUES (NEW.id, 'welcome', NEW.email, 'failed', SQLERRM)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$;

-- 4) Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.trigger_welcome_email();
