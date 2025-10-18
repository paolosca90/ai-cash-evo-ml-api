-- Aggiungi tabella per tracciare sessioni attive e conti MT5
CREATE TABLE public.user_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_info TEXT,
  ip_address TEXT,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  session_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Abilita RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Policy per le sessioni
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all sessions" 
ON public.user_sessions 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- Tabella per tracciare conti MT5 attivi
CREATE TABLE public.mt5_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_number TEXT NOT NULL,
  account_name TEXT,
  server_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_heartbeat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ea_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id) -- UN SOLO CONTO ATTIVO PER UTENTE
);

-- Abilita RLS
ALTER TABLE public.mt5_accounts ENABLE ROW LEVEL SECURITY;

-- Policy per MT5 accounts
CREATE POLICY "Users can view their own MT5 account" 
ON public.mt5_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own MT5 account" 
ON public.mt5_accounts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all MT5 accounts" 
ON public.mt5_accounts 
FOR ALL 
USING (auth.role() = 'service_role'::text);

-- Trigger per aggiornare updated_at
CREATE TRIGGER update_mt5_accounts_updated_at
BEFORE UPDATE ON public.mt5_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Funzione per validare email come API key
CREATE OR REPLACE FUNCTION public.validate_email_api_key(email_input TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id_result UUID;
  profile_email TEXT;
BEGIN
  -- Cerca l'utente tramite email nel profilo
  SELECT p.id, p.email INTO user_id_result, profile_email
  FROM public.profiles p
  WHERE LOWER(p.email) = LOWER(email_input);
  
  IF user_id_result IS NULL THEN
    -- Fallback: cerca in auth.users se non trovato nei profili
    SELECT id INTO user_id_result
    FROM auth.users
    WHERE LOWER(email) = LOWER(email_input);
  END IF;
  
  RETURN user_id_result;
END;
$$;

-- Funzione per verificare sessione unica
CREATE OR REPLACE FUNCTION public.ensure_single_session(user_id_input UUID, device_info_input TEXT, ip_address_input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_token_result TEXT;
  existing_session_count INTEGER;
BEGIN
  -- Conta sessioni attive esistenti
  SELECT COUNT(*) INTO existing_session_count
  FROM public.user_sessions
  WHERE user_id = user_id_input AND is_active = true;
  
  -- Se ci sono sessioni attive, disattivale
  IF existing_session_count > 0 THEN
    UPDATE public.user_sessions 
    SET is_active = false 
    WHERE user_id = user_id_input AND is_active = true;
  END IF;
  
  -- Genera nuovo session token
  session_token_result := 'sess_' || encode(gen_random_bytes(32), 'hex');
  
  -- Crea nuova sessione
  INSERT INTO public.user_sessions (user_id, device_info, ip_address, session_token)
  VALUES (user_id_input, device_info_input, ip_address_input, session_token_result);
  
  RETURN session_token_result;
END;
$$;

-- Funzione per registrare/aggiornare conto MT5
CREATE OR REPLACE FUNCTION public.register_mt5_account(
  user_id_input UUID,
  account_number_input TEXT,
  account_name_input TEXT DEFAULT NULL,
  server_name_input TEXT DEFAULT NULL,
  ea_version_input TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_account_user UUID;
BEGIN
  -- Verifica se questo numero di conto è già usato da un altro utente
  SELECT user_id INTO existing_account_user
  FROM public.mt5_accounts
  WHERE account_number = account_number_input AND is_active = true;
  
  -- Se il conto è usato da un altro utente, fallisce
  IF existing_account_user IS NOT NULL AND existing_account_user != user_id_input THEN
    RAISE EXCEPTION 'Conto MT5 % già in uso da un altro utente', account_number_input;
  END IF;
  
  -- Upsert del conto MT5 (un solo conto attivo per utente)
  INSERT INTO public.mt5_accounts (
    user_id, account_number, account_name, server_name, ea_version, last_heartbeat
  ) VALUES (
    user_id_input, account_number_input, account_name_input, server_name_input, ea_version_input, now()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    account_number = EXCLUDED.account_number,
    account_name = EXCLUDED.account_name,
    server_name = EXCLUDED.server_name,
    ea_version = EXCLUDED.ea_version,
    last_heartbeat = now(),
    is_active = true,
    updated_at = now();
  
  RETURN true;
END;
$$;