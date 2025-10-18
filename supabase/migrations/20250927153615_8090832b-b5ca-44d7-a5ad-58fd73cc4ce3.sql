-- Crea enum per i tipi di piano
CREATE TYPE public.subscription_plan_type AS ENUM ('essenziale', 'professional', 'enterprise');

-- Crea tabella per gestire i piani di abbonamento e le loro limitazioni
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_type subscription_plan_type NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_monthly NUMERIC(10,2) NOT NULL,
  price_annual NUMERIC(10,2) NOT NULL,
  max_signals_per_day INTEGER NOT NULL DEFAULT 1,
  can_download_ea BOOLEAN NOT NULL DEFAULT false,
  can_access_premium_features BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserisci i piani predefiniti
INSERT INTO public.subscription_plans (plan_type, name, price_monthly, price_annual, max_signals_per_day, can_download_ea, can_access_premium_features, description, features) VALUES
('essenziale', 'Essenziale', 29.99, 299.99, 1, false, false, 'Piano base per iniziare', '["1 segnale al giorno", "Analisi di base", "Supporto email"]'::jsonb),
('professional', 'Professional', 97.00, 970.00, 999, true, true, 'Piano completo per trader professionali', '["Segnali illimitati", "Expert Advisor scaricabile", "Analisi avanzata ML", "Supporto prioritario", "Accesso API"]'::jsonb),
('enterprise', 'Enterprise', 0.00, 0.00, 999, true, true, 'Piano personalizzato per aziende', '["Tutto incluso", "Soluzioni personalizzate", "Account manager dedicato"]'::jsonb);

-- Aggiorna tabella profiles per includere il piano di abbonamento
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_plan subscription_plan_type DEFAULT 'essenziale';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'stripe'; -- 'stripe' o 'crypto'
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_renewal_reminder_sent TIMESTAMP WITH TIME ZONE;

-- Crea tabella per tracciare l'uso giornaliero dei segnali
CREATE TABLE public.daily_signal_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  signals_used INTEGER NOT NULL DEFAULT 0,
  signals_limit INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_signal_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies per subscription_plans (pubblicamente leggibili)
CREATE POLICY "Subscription plans are publicly readable" 
ON public.subscription_plans 
FOR SELECT 
USING (true);

-- RLS Policies per daily_signal_usage
CREATE POLICY "Users can view their own signal usage" 
ON public.daily_signal_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own signal usage" 
ON public.daily_signal_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own signal usage" 
ON public.daily_signal_usage 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all signal usage" 
ON public.daily_signal_usage 
FOR ALL 
USING (auth.role() = 'service_role');

-- Funzione per controllare se l'utente può generare un segnale
CREATE OR REPLACE FUNCTION public.can_generate_signal(user_id_input UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Funzione per incrementare l'uso dei segnali
CREATE OR REPLACE FUNCTION public.increment_signal_usage(user_id_input UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Trigger per updated_at sulle nuove tabelle
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_signal_usage_updated_at
  BEFORE UPDATE ON public.daily_signal_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();