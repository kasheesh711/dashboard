create or replace function app.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from profiles p
  where p.auth_user_id = auth.uid()
  limit 1
$$;

create or replace function app.current_roles()
returns app_role[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(pr.role order by pr.role), '{}'::app_role[])
  from profiles p
  left join profile_roles pr on pr.profile_id = p.id
  where p.auth_user_id = auth.uid()
$$;

create or replace function app.has_role(target_role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(target_role = any(app.current_roles()), false)
$$;

create or replace function app.is_ops()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(app.has_role('ops'::app_role), false)
$$;

create or replace function app.can_access_family(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    app.is_ops()
    or exists (
      select 1
      from families f
      where f.id = target_family_id
        and f.strategist_owner_id = app.current_profile_id()
    )
    or exists (
      select 1
      from family_contacts fc
      where fc.family_id = target_family_id
        and fc.user_id = app.current_profile_id()
    ),
    false
  )
$$;
