# Data Model

## Enums

- `app_role`: `strategist`, `ops`, `parent`
- `pathway`: `us_college`, `uk_college`, `us_boarding`, `uk_boarding`
- `overall_status`: `green`, `yellow`, `red`
- `task_status`: `not_started`, `in_progress`, `blocked`, `done`, `overdue`
- `task_category`: `application`, `testing`, `academics`, `project`, `admin`
- `decision_status`: `pending`, `resolved`
- `note_author_role`: `strategist`, `ops`, `tutor_input`, `mentor_input`
- `note_visibility`: `internal`, `parent`
- `artifact_type`: `drive_folder`, `doc`, `sheet`, `slide`, `external_link`
- `school_bucket`: `reach`, `target`, `likely`
- `college_list_bucket_source`: `system`, `counselor`

## Model shift

- `families` is now the household container.
- `students` is the internal operating unit.
- Parent portal access remains family-scoped, but parent-safe data is grouped by student.
- Existing operational tables remain family-linked and now also support optional `student_id`.
- New records should be student-scoped by default.
- `student_id = null` is reserved for family-wide coordination records.

## Tables

### `profiles`

- `id uuid primary key`
- `auth_user_id uuid unique null`
- `email text unique not null`
- `full_name text not null`
- `created_at timestamptz not null default now()`

### `profile_roles`

- `profile_id uuid references profiles(id) on delete cascade`
- `role app_role not null`
- `created_at timestamptz not null default now()`
- Unique on `(profile_id, role)`
- `parent` remains exclusive and cannot coexist with internal roles

### `families`

- `id uuid primary key`
- `slug text unique not null`
- `parent_contact_name text not null`
- `strategist_owner_id uuid null references profiles(id)`
- `ops_owner_id uuid null references profiles(id)`
- `created_date date not null`
- `last_updated_date date not null`

Legacy columns remain for additive migration compatibility:

- `student_name text`
- `pathway pathway`
- `tier text`
- `current_phase text`
- `overall_status overall_status`
- `status_reason text`

### `students`

- `id uuid primary key`
- `family_id uuid not null references families(id) on delete cascade`
- `slug text unique not null`
- `student_name text not null`
- `grade_level text not null`
- `pathway pathway not null`
- `tier text not null`
- `current_phase text not null`
- `overall_status overall_status not null`
- `status_reason text not null`
- `created_date date not null`
- `last_updated_date date not null`

Required indexes:

- `students_family_idx`
- `students_pathway_status_idx`

### `family_contacts`

- `id uuid primary key`
- `family_id uuid not null references families(id) on delete cascade`
- `full_name text not null`
- `email text not null`
- `relationship text not null`
- `is_primary boolean not null default false`
- `user_id uuid null references profiles(id)`

Notes:

- A parent user is linked at the household level through `family_contacts.user_id`.
- One household can hold multiple parent contacts; one should remain primary.

### `student_testing_profiles`

- `id uuid primary key`
- `student_id uuid not null unique references students(id) on delete cascade`
- `current_sat integer`
- `projected_sat integer`
- `current_act integer`
- `projected_act integer`
- `strategy_note text`

### `student_activity_items`

- `id uuid primary key`
- `student_id uuid not null references students(id) on delete cascade`
- `activity_name text not null`
- `role text not null`
- `impact_summary text not null`
- `sort_order integer not null default 0`

### `student_competition_items`

- `id uuid primary key`
- `student_id uuid not null references students(id) on delete cascade`
- `competition_name text not null`
- `result text not null`
- `year_label text not null`
- `sort_order integer not null default 0`

### `student_school_targets`

- `id uuid primary key`
- `student_id uuid not null references students(id) on delete cascade`
- `school_name text not null`
- `country text not null`
- `bucket school_bucket not null`
- `fit_note text not null`
- `sort_order integer not null default 0`

### `family_college_strategy_profiles`

- `id uuid primary key`
- `family_id uuid not null unique references families(id) on delete cascade`
- `current_sat integer`
- `projected_sat integer`
- `current_act integer`
- `projected_act integer`
- `intended_major_codes text[] not null default '{}'`
- `intended_major_labels text[] not null default '{}'`
- `strategy_note text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Notes:

- Internal-only College Scorecard planning metadata.
- Family-scoped in v1, even when the household contains multiple students.

### `family_college_lists`

- `id uuid primary key`
- `family_id uuid not null references families(id) on delete cascade`
- `list_name text not null`
- `is_current boolean not null default false`
- `created_by uuid null references profiles(id)`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:

- Unique current list per family through a partial unique index on `(family_id)` where `is_current = true`

### `family_college_list_items`

- `id uuid primary key`
- `family_college_list_id uuid not null references family_college_lists(id) on delete cascade`
- `scorecard_school_id bigint not null`
- saved institution identity and metric snapshot columns
- `matched_program_codes text[] not null default '{}'`
- `matched_program_labels text[] not null default '{}'`
- `bucket school_bucket not null`
- `bucket_source college_list_bucket_source not null default 'system'`
- `fit_score integer not null`
- `fit_rationale text not null`
- `counselor_note text`
- `sort_order integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints:

- Unique on `(family_college_list_id, scorecard_school_id)`

### `monthly_summaries`

- `id uuid primary key`
- `family_id uuid not null references families(id) on delete cascade`
- `student_id uuid null references students(id) on delete cascade`
- `reporting_month date not null`
- `biggest_win text not null`
- `biggest_risk text not null`
- `top_next_action_1 text not null`
- `top_next_action_2 text not null`
- `top_next_action_3 text not null`
- `parent_visible_summary text not null`
- `internal_summary_notes text not null`
- `created_at timestamptz not null default now()`

Constraints:

- Unique on `(student_id, reporting_month)` when `student_id is not null`
- Unique on `(family_id, reporting_month)` when `student_id is null`

### `academic_updates`

- `id uuid primary key`
- `family_id uuid not null references families(id) on delete cascade`
- `student_id uuid null references students(id) on delete cascade`
- `date date not null`
- `subject_priority text not null`
- `grade_or_predicted_trend text not null`
- `tutoring_status text not null`
- `tutor_note_summary text not null`
- `test_prep_status text`
- `parent_visible boolean not null default true`

### `profile_updates`

- `id uuid primary key`
- `family_id uuid not null references families(id) on delete cascade`
- `student_id uuid null references students(id) on delete cascade`
- `date date not null`
- `project_name text not null`
- `milestone_status text not null`
- `evidence_added text not null`
- `mentor_note_summary text not null`
- `parent_visible boolean not null default true`

### `tasks`

- `id uuid primary key`
- `family_id uuid not null references families(id) on delete cascade`
- `student_id uuid null references students(id) on delete cascade`
- `item_name text not null`
- `category task_category not null`
- `owner text not null`
- `due_date date not null`
- `status task_status not null`
- `dependency_notes text`
- `parent_visible boolean not null default false`
- `created_at timestamptz not null default now()`

### `decision_log_items`

- `id uuid primary key`
- `family_id uuid not null references families(id) on delete cascade`
- `student_id uuid null references students(id) on delete cascade`
- `date date not null`
- `decision_type text not null`
- `summary text not null`
- `owner text not null`
- `pending_family_input boolean not null default false`
- `status decision_status not null`
- `parent_visible boolean not null default true`

### `notes`

- `id uuid primary key`
- `family_id uuid not null references families(id) on delete cascade`
- `student_id uuid null references students(id) on delete cascade`
- `date date not null`
- `author_role note_author_role not null`
- `note_type text not null`
- `summary text not null`
- `body text not null`
- `visibility note_visibility not null default 'internal'`

### `artifact_links`

- `id uuid primary key`
- `family_id uuid not null references families(id) on delete cascade`
- `student_id uuid null references students(id) on delete cascade`
- `artifact_name text not null`
- `artifact_type artifact_type not null`
- `link_url text not null`
- `upload_date date not null`
- `owner text not null`
- `parent_visible boolean not null default false`

## Visibility matrix

### Internal only

- `students.status_reason`
- `monthly_summaries.internal_summary_notes`
- `notes.visibility = 'internal'`
- `tasks.parent_visible = false`
- `artifact_links.parent_visible = false`
- `decision_log_items.parent_visible = false`
- `family_college_strategy_profiles.*`
- `family_college_lists.*`
- `family_college_list_items.*`

### Parent-safe

- `monthly_summaries.biggest_win`
- `monthly_summaries.biggest_risk`
- `monthly_summaries.top_next_action_*`
- `monthly_summaries.parent_visible_summary`
- `academic_updates.parent_visible = true`
- `profile_updates.parent_visible = true`
- `tasks.parent_visible = true`
- `artifact_links.parent_visible = true`
- `decision_log_items.parent_visible = true`

## RLS intent

- `families`: ops can read all; strategist can read assigned families; parent reads only linked family through household contact linkage.
- `students`: ops can read all; strategist can read students in assigned families; parent reads only parent-safe subsets through the linked household.
- `family_contacts`: ops and assigned strategist can read/write; parent can read only their own row if needed later.
- `student_testing_profiles`, `student_activity_items`, `student_competition_items`, `student_school_targets`, `monthly_summaries`, `academic_updates`, `profile_updates`, `tasks`, `decision_log_items`, `notes`, `artifact_links`:
- `family_college_strategy_profiles`, `family_college_lists`, `family_college_list_items`:
  - internal roles can read/write within assigned family scope
  - parent has no access
- `student_testing_profiles`, `student_activity_items`, `student_competition_items`, `student_school_targets`, `monthly_summaries`, `academic_updates`, `profile_updates`, `tasks`, `decision_log_items`, `notes`, `artifact_links`:
  - internal roles can read/write within assigned family scope
  - parents can read only rows for their linked family
  - parents can read only parent-safe subsets where applicable

Recommended implementation:

- Keep `app.current_profile_id()`, `app.current_roles()`, and `app.has_role()` helpers.
- Continue using family-link checks through `family_contacts.user_id = app.current_profile_id()`.
- Student-level access inherits from the linked family.
- Parent portal should query dedicated parent-safe projections grouped by student.
