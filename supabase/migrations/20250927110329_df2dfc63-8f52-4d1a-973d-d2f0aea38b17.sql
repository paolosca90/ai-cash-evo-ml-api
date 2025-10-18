-- Rimuovi il trigger che non funziona e crea uno nuovo che funzioni
DROP TRIGGER IF EXISTS on_auth_user_created_welcome ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_welcome();

-- Crea una funzione che funziona per la welcome email
CREATE OR REPLACE FUNCTION public.handle_new_user_welcome()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  request_id bigint;
BEGIN
  -- Invia email di benvenuto automaticamente
  SELECT
    net.http_post(
      url := 'https://rvopmdflnecyrwrzhyfy.supabase.co/functions/v1/welcome-email',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key', true) || '"}',
      body := '{"user_id": "' || NEW.id || '", "email": "' || NEW.email || '", "name": "' || COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', '') || '"}'
    ) INTO request_id;
  
  -- Log dell'attivazione
  INSERT INTO public.email_logs (user_id, email_type, recipient, status)
  VALUES (NEW.id, 'welcome', NEW.email, 'triggered')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Se fallisce, logga l'errore ma non bloccare la registrazione
    INSERT INTO public.email_logs (user_id, email_type, recipient, status, error_message)
    VALUES (NEW.id, 'welcome', NEW.email, 'failed', SQLERRM)
    ON CONFLICT DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- Crea il trigger corretto
CREATE TRIGGER on_auth_user_created_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_welcome();