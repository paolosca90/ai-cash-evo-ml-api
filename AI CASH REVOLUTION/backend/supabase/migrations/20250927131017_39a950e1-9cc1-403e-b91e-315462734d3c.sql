-- Crea tabella per le API keys degli utenti
CREATE TABLE public.user_api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'MT5 Expert Advisor',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Abilita RLS
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

-- Policy per permettere agli utenti di vedere solo le proprie API keys
CREATE POLICY "Users can view their own API keys" 
ON public.user_api_keys 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys" 
ON public.user_api_keys 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" 
ON public.user_api_keys 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" 
ON public.user_api_keys 
FOR DELETE 
USING (auth.uid() = user_id);

-- Policy per amministratori
CREATE POLICY "Admins can manage all API keys" 
ON public.user_api_keys 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_user_api_keys_updated_at
BEFORE UPDATE ON public.user_api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Funzione per generare API key sicura
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_key TEXT;
BEGIN
  -- Genera una API key sicura di 64 caratteri
  api_key := 'ak_' || encode(gen_random_bytes(32), 'hex');
  RETURN api_key;
END;
$$;

-- Funzione per validare API key e ottenere user_id
CREATE OR REPLACE FUNCTION public.validate_api_key(api_key_input TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Trigger per generare automaticamente API key alla registrazione
CREATE OR REPLACE FUNCTION public.create_user_api_key()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Crea automaticamente un'API key per il nuovo utente
  INSERT INTO public.user_api_keys (user_id, api_key, name)
  VALUES (NEW.id, public.generate_api_key(), 'Default MT5 EA Key');
  
  RETURN NEW;
END;
$$;

-- Trigger che si attiva quando un utente si registra
CREATE TRIGGER on_user_created_api_key
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_user_api_key();