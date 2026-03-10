# Workflows

## Create family + first student

1. Ops or strategist creates the household record and the first student in one flow.
2. Required household fields: family label, parent contact, parent email.
3. Required student fields: student name, grade level, pathway, tier, current phase, overall status, status reason.
4. Optional testing baseline can be added during creation.

Acceptance:

- Family and first student are both created atomically.
- New household is visible on `/families` immediately.
- New student is visible on `/dashboard` immediately.

## Add student to an existing family

1. Ops or strategist opens `/students/new` or launches from a family workspace.
2. User selects the target family if one is not already preselected.
3. User enters the new student posture and optional testing baseline.

Acceptance:

- Student is attached to the selected family only.
- Student redirects into `/students/[id]` after creation.

## Manage student portfolio

1. Strategist or ops works from `/students/[id]`.
2. Monthly summary, academic update, profile update, tasks, decisions, notes, and artifacts should be student-scoped by default.
3. Activities, competitions, testing, and school targets are managed directly on the student page.

Acceptance:

- School-fit guidance responds deterministically to current/projected SAT and school bucket mix.
- Student page remains read-first with focused composer modules.

## Manage family coordination

1. Household-wide coordination lives on `/families/[id]`.
2. Family-level decisions, notes, and resources use `student_id = null`.
3. Student cards route operators into the correct student portfolio.

Acceptance:

- Family workspace remains scan-first and does not collapse into an inline-form dump.
- Pending family-input items are visible near the top.

## Research and build college lists

1. Strategist or ops opens `/colleges` for broad research or launches from `/families/[id]` for family-aware list building.
2. Explorer queries College Scorecard live and always scopes to bachelor’s-dominant institutions.
3. Major-aware filtering uses the controlled CIP-4 picker.
4. Users preview one selected school at a time through URL-driven state while the lighter roster remains scan-first.
5. When a family context and current named list exist, the user can add the selected school directly into the workbench.
6. Bucket suggestions are system-generated, but counselor overrides remain authoritative.

Acceptance:

- College research remains internal-only.
- Family workbench stores named lists and a current list.
- The selected preview is shareable and deterministic because it stays in the URL state.
- Demo mode can browse live Scorecard data if the API key exists, but saved-list writes require Supabase.

## Publish parent view

1. Parent user signs in with magic link.
2. Parent is linked to one family through `family_contacts.user_id`.
3. Portal groups parent-safe data by student inside the linked family.

Acceptance:

- Parents cannot access internal-only notes or internal summary fields.
- Multi-student households show separate student sections without leaking sibling internal data.
