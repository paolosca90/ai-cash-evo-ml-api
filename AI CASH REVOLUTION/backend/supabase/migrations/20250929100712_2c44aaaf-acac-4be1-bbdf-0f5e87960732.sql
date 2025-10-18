-- Fix ambiguous column reference in can_generate_signal and align increment_signal_usage

-- Update can_generate_signal to avoid ambiguous reference to signals_used
CREATE OR REPLACE FUNCTION public.can_generate_signal(user_id_input uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_plan subscription_plan_type;
  daily_limit INTEGER;
  used_count INTEGER;
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
  
  -- Ottieni i segnali già usati oggi (usa alias per evitare ambiguità)
  SELECT COALESCE(dsu.signals_used, 0) INTO used_count
  FROM public.daily_signal_usage AS dsu
  WHERE dsu.user_id = user_id_input AND dsu.date = CURRENT_DATE;
  
  -- Controlla se può generare ancora segnali
  RETURN COALESCE(used_count, 0) < daily_limit;
END;
$function$;

-- Keep increment_signal_usage but qualify columns for clarity
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
  
  -- Inserisci o aggiorna l'uso (referenzia esplicitamente la tabella nell'UPDATE)
  INSERT INTO public.daily_signal_usage (user_id, date, signals_used, signals_limit)
  VALUES (user_id_input, CURRENT_DATE, 1, daily_limit)
  ON CONFLICT (user_id, date)
  DO UPDATE SET 
    signals_used = public.daily_signal_usage.signals_used + 1,
    updated_at = now();
  
  RETURN true;
END;
$function$;