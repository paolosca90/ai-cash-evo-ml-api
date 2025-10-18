-- Tabella per cachare gli eventi economici
CREATE TABLE public.economic_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  country TEXT NOT NULL,
  currency TEXT NOT NULL,
  event_name TEXT NOT NULL,
  impact TEXT NOT NULL CHECK (impact IN ('HIGH', 'MEDIUM', 'LOW')),
  category TEXT NOT NULL,
  importance INTEGER NOT NULL CHECK (importance BETWEEN 1 AND 5),
  forecast TEXT,
  previous TEXT,
  actual TEXT,
  source TEXT NOT NULL DEFAULT 'TradingEconomics',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indici per performance
CREATE INDEX idx_economic_events_date ON public.economic_events (date);
CREATE INDEX idx_economic_events_impact ON public.economic_events (impact);
CREATE INDEX idx_economic_events_country ON public.economic_events (country);

-- Trigger per updated_at
CREATE TRIGGER update_economic_events_updated_at
  BEFORE UPDATE ON public.economic_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Tabella per tracciare gli aggiornamenti
CREATE TABLE public.economic_calendar_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  update_type TEXT NOT NULL CHECK (update_type IN ('SCHEDULED', 'NEWS_TRIGGERED', 'MANUAL')),
  events_count INTEGER NOT NULL DEFAULT 0,
  api_calls_used INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'ERROR', 'PARTIAL')) DEFAULT 'SUCCESS',
  error_message TEXT,
  source TEXT NOT NULL DEFAULT 'TradingEconomics',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS policies per permettere lettura pubblica (sono dati economici pubblici)
ALTER TABLE public.economic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_calendar_updates ENABLE ROW LEVEL SECURITY;

-- Politiche per lettura pubblica degli eventi economici
CREATE POLICY "Economic events are publicly readable" 
  ON public.economic_events 
  FOR SELECT 
  USING (true);

-- Politiche per gli aggiornamenti (solo authenticated users possono vedere i log)
CREATE POLICY "Calendar updates are readable by authenticated users" 
  ON public.economic_calendar_updates 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Funzione per pulire eventi vecchi (oltre 30 giorni)
CREATE OR REPLACE FUNCTION public.cleanup_old_economic_events()
RETURNS void AS $$
BEGIN
  DELETE FROM public.economic_events 
  WHERE date < CURRENT_DATE - INTERVAL '30 days';
  
  DELETE FROM public.economic_calendar_updates 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;