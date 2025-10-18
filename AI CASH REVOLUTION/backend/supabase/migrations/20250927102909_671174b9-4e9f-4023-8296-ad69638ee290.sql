-- AGGIUNTA POLICY ADMIN: Accesso completo ai segnali per miglioramento sistema
-- Gli admin devono poter vedere tutti i segnali per analisi e ottimizzazione

-- Policy per admin: Accesso completo a tutti i segnali per analisi di sistema
CREATE POLICY "admins_can_view_all_signals" ON public.mt5_signals
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Policy per admin: Possono inserire segnali di sistema (con user_id = null)
CREATE POLICY "admins_can_insert_system_signals" ON public.mt5_signals
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Policy per admin: Possono aggiornare tutti i segnali per correzioni
CREATE POLICY "admins_can_update_all_signals" ON public.mt5_signals
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));