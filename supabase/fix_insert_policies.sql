-- Re-sync INSERT policies on empresas/usuarios that are missing/inactive
-- on the deployed project (0001_init.sql was edited in-place after being
-- applied, so this in-place edit likely never reached the remote DB).
-- Safe to re-run: drops before creating.

drop policy if exists "empresas_insert_authenticated" on empresas;
create policy "empresas_insert_authenticated" on empresas
  for insert to authenticated with check (true);

drop policy if exists "usuarios_insert_self" on usuarios;
create policy "usuarios_insert_self" on usuarios
  for insert to authenticated with check (id = auth.uid());

-- Sanity check: list every policy defined for these two tables.
-- Confirm both "..._insert_..." rows show up with cmd = 'INSERT'.
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where tablename in ('empresas', 'usuarios')
order by tablename, policyname;
