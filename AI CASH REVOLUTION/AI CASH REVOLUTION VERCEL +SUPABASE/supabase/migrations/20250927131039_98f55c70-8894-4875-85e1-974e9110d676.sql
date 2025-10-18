-- Risolvo i problemi di sicurezza relativi al search_path
-- Aggiorno le funzioni esistenti per includere il search_path

-- Aggiorna la funzione generate_api_key
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  api_key TEXT;
BEGIN
  -- Genera una API key sicura di 64 caratteri
  api_key := 'ak_' || encode(gen_random_bytes(32), 'hex');
  RETURN api_key;
END;
$$;

-- Aggiorna la funzione validate_api_key
CREATE OR REPLACE FUNCTION public.validate_api_key(api_key_input TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id_result UUID;
BEGIN
  SELECT user_id INTO user_id_result
  FROM public.user_api_keys
  WHERE api_key = api_key_input 
    AND is_active = true 
    AND (expires_at IS NULL OR expires_at > now());
  
  -- Aggiorna last_used_at se trovata
  IF user_id_result IS NOT NULL THEN
    UPDATE public.user_api_keys 
    SET last_used_at = now() 
    WHERE api_key = api_key_input;
  END IF;
  
  RETURN user_id_result;
END;
$$;

-- Aggiorna la funzione create_user_api_key
CREATE OR REPLACE FUNCTION public.create_user_api_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Crea automaticamente un'API key per il nuovo utente
  INSERT INTO public.user_api_keys (user_id, api_key, name)
  VALUES (NEW.id, public.generate_api_key(), 'Default MT5 EA Key');
  
  RETURN NEW;
END;
$$;