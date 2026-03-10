create extension if not exists pgcrypto;
create schema if not exists app;

create type app_role as enum ('strategist', 'ops', 'parent');
create type pathway as enum ('us_college', 'uk_college', 'us_boarding', 'uk_boarding');
create type overall_status as enum ('green', 'yellow', 'red');
create type task_status as enum ('not_started', 'in_progress', 'blocked', 'done', 'overdue');
create type task_category as enum ('application', 'testing', 'academics', 'project', 'admin');
create type decision_status as enum ('pending', 'resolved');
create type note_author_role as enum ('strategist', 'ops', 'tutor_input', 'mentor_input');
create type note_visibility as enum ('internal', 'parent');
create type artifact_type as enum ('drive_folder', 'doc', 'sheet', 'slide', 'external_link');

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null unique,
  full_name text not null,
  created_at timestamptz not null default now()
);

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

create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  student_name text not null,
  parent_contact_name text not null,
  pathway pathway not null,
  tier text not null,
  strategist_owner_id uuid references profiles(id),
  ops_owner_id uuid references profiles(id),
  current_phase text not null,
  overall_status overall_status not null,
  status_reason text not null,
  created_date date not null,
  last_updated_date date not null
);

create index if not exists families_slug_idx on families (slug);
create index if not exists families_pathway_status_idx on families (pathway, overall_status);
create index if not exists families_strategist_owner_idx on families (strategist_owner_id);

create table if not exists family_contacts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  full_name text not null,
  email text not null,
  relationship text not null,
  is_primary boolean not null default false,
  user_id uuid references profiles(id)
);

create table if not exists monthly_summaries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  reporting_month date not null,
  biggest_win text not null,
  biggest_risk text not null,
  top_next_action_1 text not null,
  top_next_action_2 text not null,
  top_next_action_3 text not null,
  parent_visible_summary text not null,
  internal_summary_notes text not null,
  created_at timestamptz not null default now(),
  unique (family_id, reporting_month)
);

create table if not exists academic_updates (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  date date not null,
  subject_priority text not null,
  grade_or_predicted_trend text not null,
  tutoring_status text not null,
  tutor_note_summary text not null,
  test_prep_status text,
  parent_visible boolean not null default true
);

create table if not exists profile_updates (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  date date not null,
  project_name text not null,
  milestone_status text not null,
  evidence_added text not null,
  mentor_note_summary text not null,
  parent_visible boolean not null default true
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  item_name text not null,
  category task_category not null,
  owner text not null,
  due_date date not null,
  status task_status not null,
  dependency_notes text,
  parent_visible boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists tasks_family_due_idx on tasks (family_id, due_date);
create index if not exists tasks_status_due_idx on tasks (status, due_date);

create table if not exists decision_log_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  date date not null,
  decision_type text not null,
  summary text not null,
  owner text not null,
  pending_family_input boolean not null default false,
  status decision_status not null,
  parent_visible boolean not null default true
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  date date not null,
  author_role note_author_role not null,
  note_type text not null,
  summary text not null,
  body text not null,
  visibility note_visibility not null default 'internal'
);

create index if not exists notes_family_date_idx on notes (family_id, date desc);

create table if not exists artifact_links (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  artifact_name text not null,
  artifact_type artifact_type not null,
  link_url text not null,
  upload_date date not null,
  owner text not null,
  parent_visible boolean not null default false
);

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

grant usage on schema app to anon, authenticated;
grant execute on function app.current_profile_id() to anon, authenticated;
grant execute on function app.current_roles() to anon, authenticated;
grant execute on function app.has_role(app_role) to anon, authenticated;
grant execute on function app.is_ops() to anon, authenticated;
grant execute on function app.can_access_family(uuid) to anon, authenticated;
grant execute on function app.enforce_profile_role_combination() to anon, authenticated;

create or replace view app.parent_portal_families as
select
  f.id,
  f.slug,
  f.student_name,
  f.parent_contact_name,
  f.pathway,
  f.tier,
  f.current_phase,
  f.overall_status
from families f;

create or replace view app.parent_portal_monthly_summaries as
select
  ms.id,
  ms.family_id,
  ms.reporting_month,
  ms.biggest_win,
  ms.biggest_risk,
  ms.top_next_action_1,
  ms.top_next_action_2,
  ms.top_next_action_3,
  ms.parent_visible_summary
from monthly_summaries ms;

create or replace view app.parent_portal_tasks as
select
  t.id,
  t.family_id,
  t.item_name,
  t.category,
  t.owner,
  t.due_date,
  t.status,
  t.dependency_notes
from tasks t
where t.parent_visible = true;

create or replace view app.parent_portal_decision_log_items as
select
  d.id,
  d.family_id,
  d.date,
  d.decision_type,
  d.summary,
  d.owner,
  d.pending_family_input,
  d.status
from decision_log_items d
where d.parent_visible = true;

create or replace view app.parent_portal_artifact_links as
select
  a.id,
  a.family_id,
  a.artifact_name,
  a.artifact_type,
  a.link_url,
  a.upload_date,
  a.owner
from artifact_links a
where a.parent_visible = true;

create or replace view app.parent_portal_academic_updates as
select
  au.id,
  au.family_id,
  au.date,
  au.subject_priority,
  au.grade_or_predicted_trend,
  au.tutoring_status,
  au.tutor_note_summary,
  au.test_prep_status
from academic_updates au
where au.parent_visible = true;

create or replace view app.parent_portal_profile_updates as
select
  pu.id,
  pu.family_id,
  pu.date,
  pu.project_name,
  pu.milestone_status,
  pu.evidence_added,
  pu.mentor_note_summary
from profile_updates pu
where pu.parent_visible = true;

alter table profiles enable row level security;
alter table profile_roles enable row level security;
alter table families enable row level security;
alter table family_contacts enable row level security;
alter table monthly_summaries enable row level security;
alter table academic_updates enable row level security;
alter table profile_updates enable row level security;
alter table tasks enable row level security;
alter table decision_log_items enable row level security;
alter table notes enable row level security;
alter table artifact_links enable row level security;

create policy profiles_select_self_or_ops
on profiles
for select
using (id = app.current_profile_id() or app.is_ops());

create policy profiles_internal_write
on profiles
for all
using (app.is_ops())
with check (app.is_ops());

create policy profile_roles_select_self_or_ops
on profile_roles
for select
using (profile_id = app.current_profile_id() or app.is_ops());

create policy profile_roles_internal_write
on profile_roles
for all
using (app.is_ops())
with check (app.is_ops());

create policy families_select_internal_or_linked
on families
for select
using (app.can_access_family(id));

create policy families_internal_write
on families
for all
using (app.is_ops() or strategist_owner_id = app.current_profile_id())
with check (app.is_ops() or strategist_owner_id = app.current_profile_id());

create policy family_contacts_select_internal_or_linked
on family_contacts
for select
using (app.can_access_family(family_id));

create policy family_contacts_internal_write
on family_contacts
for all
using (app.is_ops() or app.can_access_family(family_id))
with check (app.is_ops() or app.can_access_family(family_id));

create policy monthly_summaries_select_internal_only
on monthly_summaries
for select
using (app.is_ops() or exists (
  select 1 from families f
  where f.id = family_id
    and f.strategist_owner_id = app.current_profile_id()
));

create policy monthly_summaries_internal_write
on monthly_summaries
for all
using (app.is_ops() or exists (
  select 1 from families f
  where f.id = family_id
    and f.strategist_owner_id = app.current_profile_id()
))
with check (app.is_ops() or exists (
  select 1 from families f
  where f.id = family_id
    and f.strategist_owner_id = app.current_profile_id()
));

create policy academic_updates_select_internal_or_parent_visible
on academic_updates
for select
using (
  (app.is_ops() or exists (
    select 1 from families f
    where f.id = family_id
      and f.strategist_owner_id = app.current_profile_id()
  ))
  or (
    parent_visible = true
    and exists (
      select 1 from family_contacts fc
      where fc.family_id = family_id
        and fc.user_id = app.current_profile_id()
    )
  )
);

create policy academic_updates_internal_write
on academic_updates
for all
using (app.is_ops() or exists (
  select 1 from families f
  where f.id = family_id
    and f.strategist_owner_id = app.current_profile_id()
))
with check (app.is_ops() or exists (
  select 1 from families f
  where f.id = family_id
    and f.strategist_owner_id = app.current_profile_id()
));

create policy profile_updates_select_internal_or_parent_visible
on profile_updates
for select
using (
  (app.is_ops() or exists (
    select 1 from families f
    where f.id = family_id
      and f.strategist_owner_id = app.current_profile_id()
  ))
  or (
    parent_visible = true
    and exists (
      select 1 from family_contacts fc
      where fc.family_id = family_id
        and fc.user_id = app.current_profile_id()
    )
  )
);

create policy profile_updates_internal_write
on profile_updates
for all
using (app.is_ops() or exists (
  select 1 from families f
  where f.id = family_id
    and f.strategist_owner_id = app.current_profile_id()
))
with check (app.is_ops() or exists (
  select 1 from families f
  where f.id = family_id
    and f.strategist_owner_id = app.current_profile_id()
));

create policy tasks_select_internal_or_parent_visible
on tasks
for select
using (
  (app.is_ops() or exists (
    select 1 from families f
    where f.id = family_id
      and f.strategist_owner_id = app.current_profile_id()
  ))
  or (
    parent_visible = true
    and exists (
      select 1 from family_contacts fc
      where fc.family_id = family_id
        and fc.user_id = app.current_profile_id()
    )
  )
);

create policy tasks_internal_write
on tasks
for all
using (app.is_ops() or exists (
  select 1 from families f
  where f.id = family_id
    and f.strategist_owner_id = app.current_profile_id()
))
with check (app.is_ops() or exists (
  select 1 from families f
  where f.id = family_id
    and f.strategist_owner_id = app.current_profile_id()
));

create policy decision_log_select_internal_or_parent_visible
on decision_log_items
for select
using (
  (app.is_ops() or exists (
    select 1 from families f
    where f.id = family_id
      and f.strategist_owner_id = app.current_profile_id()
  ))
  or (
    parent_visible = true
    and exists (
      select 1 from family_contacts fc
      where fc.family_id = family_id
        and fc.user_id = app.current_profile_id()
    )
  )
);

create policy decision_log_internal_write
on decision_log_items
for all
using (app.is_ops() or exists (
  select 1 from families f
  where f.id = family_id
    and f.strategist_owner_id = app.current_profile_id()
))
with check (app.is_ops() or exists (
  select 1 from families f
  where f.id = family_id
    and f.strategist_owner_id = app.current_profile_id()
));

create policy notes_select_internal_or_parent_visible
on notes
for select
using (
  (app.is_ops() or exists (
    select 1 from families f
    where f.id = family_id
      and f.strategist_owner_id = app.current_profile_id()
  ))
  or (
    visibility = 'parent'
    and exists (
      select 1 from family_contacts fc
      where fc.family_id = family_id
        and fc.user_id = app.current_profile_id()
    )
  )
);

create policy notes_internal_write
on notes
for all
using (app.is_ops() or exists (
  select 1 from families f
  where f.id = family_id
    and f.strategist_owner_id = app.current_profile_id()
))
with check (app.is_ops() or exists (
  select 1 from families f
  where f.id = family_id
    and f.strategist_owner_id = app.current_profile_id()
));

create policy artifact_links_select_internal_or_parent_visible
on artifact_links
for select
using (
  (app.is_ops() or exists (
    select 1 from families f
    where f.id = family_id
      and f.strategist_owner_id = app.current_profile_id()
  ))
  or (
    parent_visible = true
    and exists (
      select 1 from family_contacts fc
      where fc.family_id = family_id
        and fc.user_id = app.current_profile_id()
    )
  )
);

create policy artifact_links_internal_write
on artifact_links
for all
using (app.is_ops() or exists (
  select 1 from families f
  where f.id = family_id
    and f.strategist_owner_id = app.current_profile_id()
))
with check (app.is_ops() or exists (
  select 1 from families f
  where f.id = family_id
    and f.strategist_owner_id = app.current_profile_id()
));
