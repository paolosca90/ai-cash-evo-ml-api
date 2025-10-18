-- Aggiungi campi per tracciare gli esiti dei trade
ALTER TABLE public.mt5_signals 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'opened', 'closed', 'cancelled')),
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS close_price DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS actual_profit DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS pips_gained DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS trade_duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS close_reason TEXT CHECK (close_reason IN ('take_profit', 'stop_loss', 'manual', 'timeout'));

-- Crea tabella per analytics collettivi 
CREATE TABLE IF NOT EXISTS public.trading_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Metriche Globali
  total_signals INTEGER DEFAULT 0,
  total_profitable INTEGER DEFAULT 0,
  total_loss INTEGER DEFAULT 0,
  overall_win_rate NUMERIC DEFAULT 0,
  total_profit NUMERIC DEFAULT 0,
  
  -- Metriche per Simbolo
  symbol TEXT NOT NULL,
  symbol_win_rate NUMERIC DEFAULT 0,
  symbol_avg_profit NUMERIC DEFAULT 0,
  symbol_total_trades INTEGER DEFAULT 0,
  
  -- Pattern Learning
  best_confidence_range JSONB, -- es: {"min": 85, "max": 95, "win_rate": 92.5}
  best_time_ranges JSONB, -- es: {"london": 85.2, "ny": 78.1}
  profitable_patterns JSONB, -- pattern che funzionano meglio
  
  UNIQUE(symbol)
);

-- Abilita RLS per analytics (leggibili da tutti gli autenticati)
ALTER TABLE public.trading_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Analytics readable by authenticated users" 
ON public.trading_analytics 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Solo service role può aggiornare analytics
CREATE POLICY "Service role can update analytics" 
ON public.trading_analytics 
FOR ALL
USING (auth.role() = 'service_role');

-- Crea funzione per aggiornare analytics automaticamente
CREATE OR REPLACE FUNCTION public.update_trading_analytics()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Crea trigger per aggiornamento automatico
CREATE TRIGGER update_trading_analytics_trigger
  AFTER UPDATE ON public.mt5_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_trading_analytics();

-- Aggiungi trigger per updated_at su mt5_signals
CREATE TRIGGER update_mt5_signals_updated_at
  BEFORE UPDATE ON public.mt5_signals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();