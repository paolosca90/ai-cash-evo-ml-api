-- Aggiungi policy per permettere agli admin di vedere tutti i profili
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- E per gestire anche tutti i profili
CREATE POLICY "Admins can update all profiles"  
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));