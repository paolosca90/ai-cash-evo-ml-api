-- Crea una funzione che attiva la welcome email quando un nuovo utente si registra
CREATE OR REPLACE FUNCTION public.trigger_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
BEGIN
  -- Chiama la welcome-email function in background
  SELECT
    net.http_post(
      url := 'https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/welcome-email',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}'::jsonb,
      body := json_build_object(
        'user_id', NEW.id,
        'email', NEW.email,
        'name', NEW.raw_user_meta_data->>'name'
      )::jsonb
    ) INTO request_id;
  
  -- Log dell'attivazione
  INSERT INTO public.email_logs (user_id, email_type, recipient, status)
  VALUES (NEW.id, 'welcome', NEW.email, 'triggered');
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Se fallisce, logga l'errore ma non bloccare la registrazione
    INSERT INTO public.email_logs (user_id, email_type, recipient, status, error_message)
    VALUES (NEW.id, 'welcome', NEW.email, 'failed', SQLERRM);
    
    RETURN NEW;
END;
$$;

-- Crea il trigger che si attiva quando un nuovo utente si registra
DROP TRIGGER IF EXISTS on_auth_user_created_welcome_email ON auth.users;
CREATE TRIGGER on_auth_user_created_welcome_email
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.trigger_welcome_email();