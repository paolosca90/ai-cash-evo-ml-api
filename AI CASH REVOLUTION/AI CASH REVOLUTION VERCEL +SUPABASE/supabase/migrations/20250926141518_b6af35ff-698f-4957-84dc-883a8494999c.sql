-- Controlla le policy esistenti
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'mt5_signals';

-- Se ci sono policy esistenti, rimuovile tutte
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'mt5_signals'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.mt5_signals';
    END LOOP;
END $$;

-- Ora crea le nuove policy
CREATE POLICY "Users can view all MT5 signals" 
ON public.mt5_signals 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert MT5 signals" 
ON public.mt5_signals 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update MT5 signals" 
ON public.mt5_signals 
FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can delete MT5 signals" 
ON public.mt5_signals 
FOR DELETE 
USING (auth.role() = 'service_role');