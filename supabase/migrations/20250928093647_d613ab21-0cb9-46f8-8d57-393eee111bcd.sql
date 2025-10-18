-- Aggiorna il piano essenziale: 1 segnale al giorno, nessun Expert Advisor
UPDATE public.subscription_plans 
SET 
  max_signals_per_day = 1,
  can_download_ea = false,
  description = 'Piano base con 1 segnale al giorno',
  features = '["1 segnale AI al giorno", "Analisi di base", "Dashboard di controllo", "Supporto email"]'::jsonb
WHERE plan_type = 'essenziale';

-- Aggiorna il piano professional: segnali illimitati, Expert Advisor incluso
UPDATE public.subscription_plans 
SET 
  max_signals_per_day = 999,
  can_download_ea = true,
  description = 'Piano avanzato con segnali illimitati e ML',
  features = '["Segnali illimitati", "ML optimized trading", "Expert Advisor MT5", "Analisi avanzate AI", "Supporto prioritario", "Trading automatico"]'::jsonb
WHERE plan_type = 'professional';

-- Rimuovi il piano enterprise se esiste
DELETE FROM public.subscription_plans 
WHERE plan_type = 'enterprise';