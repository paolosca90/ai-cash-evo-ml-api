-- Fix function search path for all user-defined functions that don't have it set
CREATE OR REPLACE FUNCTION public.update_trading_analytics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Solo quando un trade viene chiuso
  IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
    
    -- Aggiorna o inserisci analytics per questo simbolo
    INSERT INTO public.trading_analytics (
      symbol, 
      symbol_total_trades,
      symbol_win_rate,
      symbol_avg_profit
    ) 
    VALUES (
      NEW.symbol,
      1,
      CASE WHEN NEW.actual_profit > 0 THEN 100.0 ELSE 0.0 END,
      COALESCE(NEW.actual_profit, 0)
    )
    ON CONFLICT (symbol) 
    DO UPDATE SET
      symbol_total_trades = trading_analytics.symbol_total_trades + 1,
      symbol_win_rate = (
        SELECT (COUNT(*) FILTER (WHERE actual_profit > 0) * 100.0 / COUNT(*))
        FROM public.mt5_signals 
        WHERE symbol = NEW.symbol AND status = 'closed'
      ),
      symbol_avg_profit = (
        SELECT AVG(actual_profit)
        FROM public.mt5_signals 
        WHERE symbol = NEW.symbol AND status = 'closed'
      ),
      updated_at = now();
      
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  api_key TEXT;
BEGIN
  -- Genera una API key sicura di 64 caratteri
  api_key := 'ak_' || encode(gen_random_bytes(32), 'hex');
  RETURN api_key;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_api_key(api_key_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.create_user_api_key()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Crea automaticamente un'API key per il nuovo utente
  INSERT INTO public.user_api_keys (user_id, api_key, name)
  VALUES (NEW.id, public.generate_api_key(), 'Default MT5 EA Key');
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_email_api_key(email_input text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.ensure_single_session(user_id_input uuid, device_info_input text, ip_address_input text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.register_mt5_account(user_id_input uuid, account_number_input text, account_name_input text DEFAULT NULL::text, server_name_input text DEFAULT NULL::text, ea_version_input text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.can_generate_signal(user_id_input uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_plan subscription_plan_type;
  daily_limit INTEGER;
  signals_used INTEGER;
BEGIN
  -- Ottieni il piano dell'utente
  SELECT subscription_plan INTO user_plan
  FROM public.profiles
  WHERE id = user_id_input;
  
  IF user_plan IS NULL THEN
    user_plan := 'essenziale'; -- Default
  END IF;
  
  -- Ottieni il limite giornaliero per il piano
  SELECT max_signals_per_day INTO daily_limit
  FROM public.subscription_plans
  WHERE plan_type = user_plan;
  
  -- Ottieni i segnali già usati oggi
  SELECT COALESCE(signals_used, 0) INTO signals_used
  FROM public.daily_signal_usage
  WHERE user_id = user_id_input AND date = CURRENT_DATE;
  
  -- Controlla se può generare ancora segnali
  RETURN COALESCE(signals_used, 0) < daily_limit;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_signal_usage(user_id_input uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_plan subscription_plan_type;
  daily_limit INTEGER;
BEGIN
  -- Ottieni il piano dell'utente
  SELECT subscription_plan INTO user_plan
  FROM public.profiles
  WHERE id = user_id_input;
  
  IF user_plan IS NULL THEN
    user_plan := 'essenziale';
  END IF;
  
  -- Ottieni il limite giornaliero
  SELECT max_signals_per_day INTO daily_limit
  FROM public.subscription_plans
  WHERE plan_type = user_plan;
  
  -- Inserisci o aggiorna l'uso
  INSERT INTO public.daily_signal_usage (user_id, date, signals_used, signals_limit)
  VALUES (user_id_input, CURRENT_DATE, 1, daily_limit)
  ON CONFLICT (user_id, date)
  DO UPDATE SET 
    signals_used = daily_signal_usage.signals_used + 1,
    updated_at = now();
  
  RETURN true;
END;
$function$;