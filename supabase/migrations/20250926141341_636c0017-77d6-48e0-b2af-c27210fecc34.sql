-- Rimuovi le policy che negano tutto
DROP POLICY IF EXISTS "mt5_signals_select_denied" ON public.mt5_signals;
DROP POLICY IF EXISTS "mt5_signals_insert_denied" ON public.mt5_signals;
DROP POLICY IF EXISTS "mt5_signals_update_denied" ON public.mt5_signals;
DROP POLICY IF EXISTS "mt5_signals_delete_denied" ON public.mt5_signals;

-- Crea policy per permettere agli utenti autenticati di vedere tutti i segnali MT5
CREATE POLICY "Users can view all MT5 signals" 
ON public.mt5_signals 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Permetti agli utenti autenticati di inserire segnali
CREATE POLICY "Users can insert MT5 signals" 
ON public.mt5_signals 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Permetti agli utenti autenticati di aggiornare i segnali
CREATE POLICY "Users can update MT5 signals" 
ON public.mt5_signals 
FOR UPDATE 
USING (auth.role() = 'authenticated');

-- Permetti la cancellazione solo agli admin (per ora limitata)
CREATE POLICY "Service role can delete MT5 signals" 
ON public.mt5_signals 
FOR DELETE 
USING (auth.role() = 'service_role');