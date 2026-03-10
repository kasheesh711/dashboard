create table if not exists profile_roles (
  profile_id uuid not null references profiles(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, role)
);

create or replace function app.enforce_profile_role_combination()
returns trigger
language plpgsql
as $$
begin
  if new.role = 'parent' and exists (
    select 1
    from profile_roles pr
    where pr.profile_id = new.profile_id
      and pr.role <> 'parent'
  ) then
    raise exception 'Parent role cannot be combined with internal roles.';
  end if;

  if new.role <> 'parent' and exists (
    select 1
    from profile_roles pr
    where pr.profile_id = new.profile_id
      and pr.role = 'parent'
  ) then
    raise exception 'Internal roles cannot be combined with parent role.';
  end if;

  return new;
end;
$$;

drop trigger if exists profile_roles_combination_guard on profile_roles;

create trigger profile_roles_combination_guard
before insert or update on profile_roles
for each row
execute function app.enforce_profile_role_combination();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'role'
  ) then
    execute $sql$
      insert into profile_roles (profile_id, role)
      select id, role
      from profiles
      on conflict (profile_id, role) do nothing
    $sql$;

    execute 'alter table profiles drop column role';
  end if;
end;
$$;

alter table profile_roles enable row level security;

drop policy if exists profile_roles_select_self_or_ops on profile_roles;
create policy profile_roles_select_self_or_ops
on profile_roles
for select
using (profile_id = app.current_profile_id() or app.is_ops());

drop policy if exists profile_roles_internal_write on profile_roles;
create policy profile_roles_internal_write
on profile_roles
for all
using (app.is_ops())
with check (app.is_ops());

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
