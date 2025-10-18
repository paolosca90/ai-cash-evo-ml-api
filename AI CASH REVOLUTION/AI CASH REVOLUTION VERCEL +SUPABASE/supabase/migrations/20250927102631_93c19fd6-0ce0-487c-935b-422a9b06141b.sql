-- CORREZIONE CRITICA DI SICUREZZA: Protezione dati trading mt5_signals
-- PROBLEMA: Tutti gli utenti autenticati possono vedere i dati di trading di tutti gli altri
-- SOLUZIONE: Ogni utente può vedere solo i propri segnali di trading

-- 1. Prima aggiungo una colonna user_id per collegare i segnali agli utenti
ALTER TABLE public.mt5_signals 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Rimuovo le policy pericolose attuali
DROP POLICY IF EXISTS "Users can view all MT5 signals" ON public.mt5_signals;
DROP POLICY IF EXISTS "Users can insert MT5 signals" ON public.mt5_signals;
DROP POLICY IF EXISTS "Users can update MT5 signals" ON public.mt5_signals;
DROP POLICY IF EXISTS "Service role can delete MT5 signals" ON public.mt5_signals;

-- 3. Creo policy SICURE che limitano l'accesso ai propri dati
-- SELECT: Solo i propri segnali di trading
CREATE POLICY "secure_users_own_signals_select" ON public.mt5_signals
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- INSERT: Solo per i propri segnali (deve specificare user_id = auth.uid())
CREATE POLICY "secure_users_own_signals_insert" ON public.mt5_signals
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Solo i propri segnali di trading
CREATE POLICY "secure_users_own_signals_update" ON public.mt5_signals
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Solo i propri segnali di trading
CREATE POLICY "secure_users_own_signals_delete" ON public.mt5_signals
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- 4. Policy speciale per il service role (per operazioni di sistema)
CREATE POLICY "service_role_full_access" ON public.mt5_signals
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- 5. Assicuro che RLS sia abilitato
ALTER TABLE public.mt5_signals ENABLE ROW LEVEL SECURITY;