-- ULTERIORE RAFFORZAMENTO SICUREZZA: Ottimizzazione policy RLS per profiles
-- Assicuriamoci che le policy siano il più restrittive possibile

-- Rimuovo tutte le policy esistenti per ricrearle in modo più sicuro
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can only view their own complete profile" ON public.profiles;

-- Policy per SELECT: SOLO il proprio profilo, NESSUN ACCESSO ad altri profili
CREATE POLICY "strict_users_own_profile_select" ON public.profiles
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Policy per INSERT: SOLO il proprio profilo
CREATE POLICY "strict_users_own_profile_insert" ON public.profiles
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy per UPDATE: SOLO il proprio profilo  
CREATE POLICY "strict_users_own_profile_update" ON public.profiles
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Policy per DELETE: SOLO il proprio profilo
CREATE POLICY "strict_users_own_profile_delete" ON public.profiles
FOR DELETE 
TO authenticated
USING (auth.uid() = id);

-- Verifico che RLS sia abilitato
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- IMPORTANTE: Nessuna policy per ruolo 'anon' (utenti non autenticati)
-- Questo significa che gli utenti anonimi non possono accedere a NESSUN profilo