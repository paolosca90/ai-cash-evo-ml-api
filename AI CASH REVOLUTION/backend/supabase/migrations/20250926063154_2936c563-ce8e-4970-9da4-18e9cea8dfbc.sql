-- Add strict RLS policies so only service role (which bypasses RLS) can access
-- Everyone else (anon/auth) effectively has no access

-- SELECT denied for all
create policy mt5_signals_select_denied on public.mt5_signals
for select using (false);

-- INSERT denied for all
create policy mt5_signals_insert_denied on public.mt5_signals
for insert with check (false);

-- UPDATE denied for all
create policy mt5_signals_update_denied on public.mt5_signals
for update using (false) with check (false);

-- DELETE denied for all
create policy mt5_signals_delete_denied on public.mt5_signals
for delete using (false);