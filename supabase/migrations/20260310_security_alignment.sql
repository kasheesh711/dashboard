create or replace function app.can_manage_family(target_family_id uuid)
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
    ),
    false
  )
$$;

create or replace function app.can_manage_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from students s
      where s.id = target_student_id
        and app.can_manage_family(s.family_id)
    ),
    false
  )
$$;

grant execute on function app.can_manage_family(uuid) to anon, authenticated;
grant execute on function app.can_manage_student(uuid) to anon, authenticated;

create or replace function public.bootstrap_profile()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_profile_id uuid;
  profile_email text;
  resolved_roles app_role[];
begin
  profile_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  if auth.uid() is null or profile_email = '' then
    return null;
  end if;

  update profiles
  set auth_user_id = auth.uid()
  where lower(email) = profile_email
    and (auth_user_id is null or auth_user_id = auth.uid())
  returning id into resolved_profile_id;

  if resolved_profile_id is null then
    select p.id
    into resolved_profile_id
    from profiles p
    where lower(p.email) = profile_email
      and p.auth_user_id = auth.uid()
    limit 1;
  end if;

  if resolved_profile_id is null then
    return null;
  end if;

  select coalesce(array_agg(pr.role order by pr.role), '{}'::app_role[])
  into resolved_roles
  from profile_roles pr
  where pr.profile_id = resolved_profile_id;

  if 'parent'::app_role = any(resolved_roles) then
    update family_contacts
    set user_id = resolved_profile_id
    where lower(email) = profile_email
      and (user_id is null or user_id = resolved_profile_id);
  end if;

  return resolved_profile_id;
end;
$$;

grant execute on function public.bootstrap_profile() to authenticated;

create or replace view app.parent_portal_students as
select
  s.id,
  s.family_id,
  s.slug,
  s.student_name,
  s.grade_level,
  s.pathway,
  s.tier,
  s.current_phase,
  s.overall_status,
  s.created_date,
  s.last_updated_date
from students s;

drop view if exists app.parent_portal_monthly_summaries;
create view app.parent_portal_monthly_summaries as
select
  ms.id,
  ms.family_id,
  ms.student_id,
  ms.reporting_month,
  ms.biggest_win,
  ms.biggest_risk,
  ms.top_next_action_1,
  ms.top_next_action_2,
  ms.top_next_action_3,
  ms.parent_visible_summary
from monthly_summaries ms;

drop view if exists app.parent_portal_tasks;
create view app.parent_portal_tasks as
select
  t.id,
  t.family_id,
  t.student_id,
  t.item_name,
  t.category,
  t.owner,
  t.due_date,
  t.status,
  t.dependency_notes
from tasks t
where t.parent_visible = true;

drop view if exists app.parent_portal_decision_log_items;
create view app.parent_portal_decision_log_items as
select
  d.id,
  d.family_id,
  d.student_id,
  d.date,
  d.decision_type,
  d.summary,
  d.owner,
  d.pending_family_input,
  d.status
from decision_log_items d
where d.parent_visible = true;

drop view if exists app.parent_portal_artifact_links;
create view app.parent_portal_artifact_links as
select
  a.id,
  a.family_id,
  a.student_id,
  a.artifact_name,
  a.artifact_type,
  a.link_url,
  a.upload_date,
  a.owner
from artifact_links a
where a.parent_visible = true;

drop view if exists app.parent_portal_academic_updates;
create view app.parent_portal_academic_updates as
select
  au.id,
  au.family_id,
  au.student_id,
  au.date,
  au.subject_priority,
  au.grade_or_predicted_trend,
  au.tutoring_status,
  au.tutor_note_summary,
  au.test_prep_status
from academic_updates au
where au.parent_visible = true;

drop view if exists app.parent_portal_profile_updates;
create view app.parent_portal_profile_updates as
select
  pu.id,
  pu.family_id,
  pu.student_id,
  pu.date,
  pu.project_name,
  pu.milestone_status,
  pu.evidence_added,
  pu.mentor_note_summary
from profile_updates pu
where pu.parent_visible = true;

grant select on table
  app.parent_portal_students,
  app.parent_portal_families,
  app.parent_portal_monthly_summaries,
  app.parent_portal_tasks,
  app.parent_portal_decision_log_items,
  app.parent_portal_artifact_links,
  app.parent_portal_academic_updates,
  app.parent_portal_profile_updates
to authenticated;

alter table students enable row level security;
alter table student_testing_profiles enable row level security;
alter table student_activity_items enable row level security;
alter table student_competition_items enable row level security;
alter table student_school_targets enable row level security;

drop policy if exists family_contacts_select_internal_or_linked on family_contacts;
create policy family_contacts_select_internal_or_self
on family_contacts
for select
using (
  app.can_manage_family(family_id)
  or user_id = app.current_profile_id()
);

drop policy if exists family_contacts_internal_write on family_contacts;
create policy family_contacts_internal_write
on family_contacts
for all
using (app.can_manage_family(family_id))
with check (app.can_manage_family(family_id));

drop policy if exists students_select_internal_only on students;
create policy students_select_internal_only
on students
for select
using (app.can_manage_student(id));

drop policy if exists students_internal_write on students;
create policy students_internal_write
on students
for all
using (app.can_manage_student(id))
with check (app.can_manage_family(family_id));

drop policy if exists student_testing_profiles_select_internal_only on student_testing_profiles;
create policy student_testing_profiles_select_internal_only
on student_testing_profiles
for select
using (app.can_manage_student(student_id));

drop policy if exists student_testing_profiles_internal_write on student_testing_profiles;
create policy student_testing_profiles_internal_write
on student_testing_profiles
for all
using (app.can_manage_student(student_id))
with check (app.can_manage_student(student_id));

drop policy if exists student_activity_items_select_internal_only on student_activity_items;
create policy student_activity_items_select_internal_only
on student_activity_items
for select
using (app.can_manage_student(student_id));

drop policy if exists student_activity_items_internal_write on student_activity_items;
create policy student_activity_items_internal_write
on student_activity_items
for all
using (app.can_manage_student(student_id))
with check (app.can_manage_student(student_id));

drop policy if exists student_competition_items_select_internal_only on student_competition_items;
create policy student_competition_items_select_internal_only
on student_competition_items
for select
using (app.can_manage_student(student_id));

drop policy if exists student_competition_items_internal_write on student_competition_items;
create policy student_competition_items_internal_write
on student_competition_items
for all
using (app.can_manage_student(student_id))
with check (app.can_manage_student(student_id));

drop policy if exists student_school_targets_select_internal_only on student_school_targets;
create policy student_school_targets_select_internal_only
on student_school_targets
for select
using (app.can_manage_student(student_id));

drop policy if exists student_school_targets_internal_write on student_school_targets;
create policy student_school_targets_internal_write
on student_school_targets
for all
using (app.can_manage_student(student_id))
with check (app.can_manage_student(student_id));
