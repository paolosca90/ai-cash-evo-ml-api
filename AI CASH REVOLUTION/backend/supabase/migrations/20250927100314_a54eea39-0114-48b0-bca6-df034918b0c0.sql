-- Prima rimuovi i dati correlati agli utenti dalle tabelle pubbliche
DELETE FROM public.profiles;
DELETE FROM public.user_roles;
DELETE FROM public.email_logs;

-- Poi rimuovi tutti gli utenti dal sistema auth
-- Questo attiverà automaticamente le cascade delete per le foreign key
DELETE FROM auth.users;