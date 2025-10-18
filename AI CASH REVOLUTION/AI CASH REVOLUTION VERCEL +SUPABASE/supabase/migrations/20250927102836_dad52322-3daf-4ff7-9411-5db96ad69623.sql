-- CORREZIONE: Gestione trigger e policy per mt5_signals
-- Il trigger update_updated_at_column sta causando errori perché mt5_signals non ha updated_at

-- 1. Prima rimuovo il trigger problematico se esiste
DROP TRIGGER IF EXISTS update_mt5_signals_updated_at ON public.mt5_signals;

-- 2. Ora riprovo a aggiornare le policy di sicurezza
-- Rimuovo le policy attuali
DROP POLICY IF EXISTS "secure_users_own_signals_select" ON public.mt5_signals;
DROP POLICY IF EXISTS "secure_users_own_signals_insert" ON public.mt5_signals;
DROP POLICY IF EXISTS "secure_users_own_signals_update" ON public.mt5_signals;
DROP POLICY IF EXISTS "secure_users_own_signals_delete" ON public.mt5_signals;

-- 3. Creo le policy di sicurezza corrette
-- SELECT: Gli utenti possono vedere i loro segnali E i segnali di sistema (user_id = null)
CREATE POLICY "users_can_view_own_and_system_signals" ON public.mt5_signals
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id OR user_id IS NULL);

-- INSERT: Gli utenti possono inserire solo i propri segnali
CREATE POLICY "users_can_insert_own_signals" ON public.mt5_signals
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Solo i propri segnali 
CREATE POLICY "users_can_update_own_signals" ON public.mt5_signals
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- DELETE: Solo i propri segnali
CREATE POLICY "users_can_delete_own_signals" ON public.mt5_signals
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- 4. Policy per service role: Accesso completo per operazioni di sistema
CREATE POLICY "service_role_full_access_mt5" ON public.mt5_signals
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);