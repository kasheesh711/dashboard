do $$
begin
  if not exists (select 1 from pg_type where typname = 'college_list_bucket_source') then
    create type college_list_bucket_source as enum ('system', 'counselor');
  end if;
end
$$;

create table if not exists family_college_strategy_profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null unique references families(id) on delete cascade,
  current_sat integer,
  projected_sat integer,
  current_act integer,
  projected_act integer,
  intended_major_codes text[] not null default '{}',
  intended_major_labels text[] not null default '{}',
  strategy_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists family_college_lists (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  list_name text not null,
  is_current boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists family_college_lists_family_idx
  on family_college_lists (family_id, created_at desc);

create unique index if not exists family_college_lists_current_unique
  on family_college_lists (family_id)
  where is_current = true;

create table if not exists family_college_list_items (
  id uuid primary key default gen_random_uuid(),
  family_college_list_id uuid not null references family_college_lists(id) on delete cascade,
  scorecard_school_id bigint not null,
  school_name text not null,
  city text not null,
  state text not null,
  ownership text not null,
  student_size integer,
  admission_rate numeric,
  sat_average integer,
  completion_rate numeric,
  retention_rate numeric,
  average_net_price integer,
  median_earnings integer,
  matched_program_codes text[] not null default '{}',
  matched_program_labels text[] not null default '{}',
  bucket school_bucket not null,
  bucket_source college_list_bucket_source not null default 'system',
  fit_score integer not null,
  fit_rationale text not null,
  counselor_note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists family_college_list_items_list_idx
  on family_college_list_items (family_college_list_id, sort_order);

create unique index if not exists family_college_list_items_list_school_unique
  on family_college_list_items (family_college_list_id, scorecard_school_id);

alter table family_college_strategy_profiles enable row level security;
alter table family_college_lists enable row level security;
alter table family_college_list_items enable row level security;

create policy family_college_strategy_profiles_select_internal
on family_college_strategy_profiles
for select
using (
  app.is_ops()
  or exists (
    select 1
    from families f
    where f.id = family_id
      and f.strategist_owner_id = app.current_profile_id()
  )
);

create policy family_college_strategy_profiles_write_internal
on family_college_strategy_profiles
for all
using (
  app.is_ops()
  or exists (
    select 1
    from families f
    where f.id = family_id
      and f.strategist_owner_id = app.current_profile_id()
  )
)
with check (
  app.is_ops()
  or exists (
    select 1
    from families f
    where f.id = family_id
      and f.strategist_owner_id = app.current_profile_id()
  )
);

create policy family_college_lists_select_internal
on family_college_lists
for select
using (
  app.is_ops()
  or exists (
    select 1
    from families f
    where f.id = family_id
      and f.strategist_owner_id = app.current_profile_id()
  )
);

create policy family_college_lists_write_internal
on family_college_lists
for all
using (
  app.is_ops()
  or exists (
    select 1
    from families f
    where f.id = family_id
      and f.strategist_owner_id = app.current_profile_id()
  )
)
with check (
  app.is_ops()
  or exists (
    select 1
    from families f
    where f.id = family_id
      and f.strategist_owner_id = app.current_profile_id()
  )
);

create policy family_college_list_items_select_internal
on family_college_list_items
for select
using (
  app.is_ops()
  or exists (
    select 1
    from family_college_lists l
    join families f on f.id = l.family_id
    where l.id = family_college_list_id
      and f.strategist_owner_id = app.current_profile_id()
  )
);

create policy family_college_list_items_write_internal
on family_college_list_items
for all
using (
  app.is_ops()
  or exists (
    select 1
    from family_college_lists l
    join families f on f.id = l.family_id
    where l.id = family_college_list_id
      and f.strategist_owner_id = app.current_profile_id()
  )
)
with check (
  app.is_ops()
  or exists (
    select 1
    from family_college_lists l
    join families f on f.id = l.family_id
    where l.id = family_college_list_id
      and f.strategist_owner_id = app.current_profile_id()
  )
);
