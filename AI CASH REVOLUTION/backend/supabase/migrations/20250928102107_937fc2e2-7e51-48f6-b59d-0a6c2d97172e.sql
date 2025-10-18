-- Aggiungi ruolo admin all'utente paoloscardia@gmail.com
INSERT INTO public.user_roles (user_id, role)
VALUES ('bc4c44e2-09b9-4179-bddc-2c571c30eda6', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;