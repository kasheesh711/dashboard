grant usage on schema app to anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app'
      and p.proname = 'current_profile_id'
  ) then
    execute 'grant execute on function app.current_profile_id() to anon, authenticated';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app'
      and p.proname = 'current_roles'
  ) then
    execute 'grant execute on function app.current_roles() to anon, authenticated';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app'
      and p.proname = 'has_role'
  ) then
    execute 'grant execute on function app.has_role(app_role) to anon, authenticated';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app'
      and p.proname = 'is_ops'
  ) then
    execute 'grant execute on function app.is_ops() to anon, authenticated';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'app'
      and p.proname = 'can_access_family'
  ) then
    execute 'grant execute on function app.can_access_family(uuid) to anon, authenticated';
  end if;
end;
$$;
