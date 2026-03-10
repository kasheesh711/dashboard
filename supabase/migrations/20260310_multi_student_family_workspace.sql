do $$
begin
  if not exists (select 1 from pg_type where typname = 'school_bucket') then
    create type school_bucket as enum ('reach', 'target', 'likely');
  end if;
end
$$;

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  slug text not null unique,
  student_name text not null,
  grade_level text not null,
  pathway pathway not null,
  tier text not null,
  current_phase text not null,
  overall_status overall_status not null,
  status_reason text not null,
  created_date date not null,
  last_updated_date date not null
);

create index if not exists students_family_idx on students (family_id);
create index if not exists students_pathway_status_idx on students (pathway, overall_status);

create table if not exists student_testing_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references students(id) on delete cascade,
  current_sat integer,
  projected_sat integer,
  current_act integer,
  projected_act integer,
  strategy_note text
);

create table if not exists student_activity_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  activity_name text not null,
  role text not null,
  impact_summary text not null,
  sort_order integer not null default 0
);

create index if not exists student_activity_items_student_idx on student_activity_items (student_id, sort_order);

create table if not exists student_competition_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  competition_name text not null,
  result text not null,
  year_label text not null,
  sort_order integer not null default 0
);

create index if not exists student_competition_items_student_idx on student_competition_items (student_id, sort_order);

create table if not exists student_school_targets (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  school_name text not null,
  country text not null,
  bucket school_bucket not null,
  fit_note text not null,
  sort_order integer not null default 0
);

create index if not exists student_school_targets_student_idx on student_school_targets (student_id, sort_order);

alter table monthly_summaries add column if not exists student_id uuid references students(id) on delete cascade;
alter table academic_updates add column if not exists student_id uuid references students(id) on delete cascade;
alter table profile_updates add column if not exists student_id uuid references students(id) on delete cascade;
alter table tasks add column if not exists student_id uuid references students(id) on delete cascade;
alter table decision_log_items add column if not exists student_id uuid references students(id) on delete cascade;
alter table notes add column if not exists student_id uuid references students(id) on delete cascade;
alter table artifact_links add column if not exists student_id uuid references students(id) on delete cascade;

create index if not exists monthly_summaries_student_idx on monthly_summaries (student_id, reporting_month);
create index if not exists academic_updates_student_idx on academic_updates (student_id, date desc);
create index if not exists profile_updates_student_idx on profile_updates (student_id, date desc);
create index if not exists tasks_student_due_idx on tasks (student_id, due_date);
create index if not exists decision_log_items_student_idx on decision_log_items (student_id, date desc);
create index if not exists notes_student_idx on notes (student_id, date desc);
create index if not exists artifact_links_student_idx on artifact_links (student_id, upload_date desc);

alter table monthly_summaries
  drop constraint if exists monthly_summaries_family_id_reporting_month_key;

create unique index if not exists monthly_summaries_family_month_unique
  on monthly_summaries (family_id, reporting_month)
  where student_id is null;

create unique index if not exists monthly_summaries_student_month_unique
  on monthly_summaries (student_id, reporting_month)
  where student_id is not null;

insert into students (
  family_id,
  slug,
  student_name,
  grade_level,
  pathway,
  tier,
  current_phase,
  overall_status,
  status_reason,
  created_date,
  last_updated_date
)
select
  f.id,
  case
    when f.student_name is null or btrim(f.student_name) = '' then f.slug || '-student'
    else left(regexp_replace(lower(f.student_name), '[^a-z0-9]+', '-', 'g'), 60)
  end,
  coalesce(nullif(f.student_name, ''), f.parent_contact_name),
  'Grade 11',
  coalesce(f.pathway, 'us_college'::pathway),
  coalesce(f.tier, 'Core Pathway'),
  coalesce(f.current_phase, 'Launch and roadmap'),
  coalesce(f.overall_status, 'green'::overall_status),
  coalesce(f.status_reason, 'Legacy family posture migrated to the first student record.'),
  f.created_date,
  f.last_updated_date
from families f
where not exists (
  select 1
  from students s
  where s.family_id = f.id
);

update monthly_summaries ms
set student_id = s.id
from students s
where ms.family_id = s.family_id
  and ms.student_id is null
  and not exists (
    select 1
    from monthly_summaries existing
    where existing.student_id = s.id
      and existing.reporting_month = ms.reporting_month
      and existing.id <> ms.id
  );

update academic_updates au
set student_id = s.id
from students s
where au.family_id = s.family_id
  and au.student_id is null;

update profile_updates pu
set student_id = s.id
from students s
where pu.family_id = s.family_id
  and pu.student_id is null;

update tasks t
set student_id = s.id
from students s
where t.family_id = s.family_id
  and t.student_id is null;

update decision_log_items d
set student_id = s.id
from students s
where d.family_id = s.family_id
  and d.student_id is null;

update notes n
set student_id = s.id
from students s
where n.family_id = s.family_id
  and n.student_id is null;

update artifact_links a
set student_id = s.id
from students s
where a.family_id = s.family_id
  and a.student_id is null;
