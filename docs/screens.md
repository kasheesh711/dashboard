# Screens

## Route map

- `/`: product landing and workspace status
- `/sign-in`: magic-link entry point and demo/live mode guidance
- `/dashboard`: internal student-first command center
- `/families`: internal household roster
- `/families/new`: create family + first student
- `/families/[id]`: family workspace
- `/analytics`: internal Collegebase applicant analytics
- `/analytics/applicants/[sourceId]`: extracted applicant drill-down
- `/colleges`: internal College Scorecard explorer
- `/students/new`: add student to an existing family
- `/students/[id]`: student 360 portfolio
- `/portal`: parent-safe family dashboard grouped by student

## `/dashboard`

Audience:

- strategist
- ops

Sections:

- short hero strip with mode, scope, and workload posture
- four KPI cards: active students, urgent students, overdue items, parent-visible due soon
- dominant priority student queue
- adjacent deadline map
- school-fit guidance rail

Behavior:

- default ordering prioritizes red students, then overdue work, then nearest due date
- design stays editorial and premium, not generic SaaS
- CTA band includes both `New family` and `Add student`

## `/families`

Audience:

- strategist
- ops

Controls:

- search by family label, parent contact, or student name
- filter by strategist
- filter by pathway
- filter by status
- filter by deadline window

Roster fields:

- family label
- parent contact
- strategist and ops owners
- student count
- student names
- active statuses across students
- next critical due date
- biggest current risk
- pending decisions
- overdue count
- last updated

Behavior:

- remains family-first
- desktop layout is scan-first, not card-heavy storytelling
- each row offers `Open family workspace` and `Add student`

## `/families/new`

Audience:

- strategist
- ops

Layout:

- split household section and first-student section

Required household fields:

- family label
- parent contact name
- parent email

Required first-student fields:

- student name
- grade level
- pathway
- tier
- current phase
- overall status
- status reason

Optional first-student fields:

- current/projected SAT
- current/projected ACT
- testing strategy note

Behavior:

- creates both records in one flow
- redirects to the new family workspace

## `/families/[id]`

Audience:

- strategist
- ops

Layout:

- read-first family cockpit
- household header
- student roster as the dominant module
- family-wide coordination modules below

Sections:

- family overview
- student roster
- college strategy and school list workbench
- pending family-input items
- latest family coordination notes
- family-wide resources

Behavior:

- no tab-heavy admin shell
- student cards link directly to `/students/[id]`
- family-wide composers are secondary and collapsible
- college workbench is internal-only and v1 is limited to US college planning

## `/colleges`

Audience:

- strategist
- ops

Layout:

- warm editorial header
- sticky research filter rail
- selected-school featured preview above a compact result roster
- optional family context strip when opened with `?family=<slug>`

Behavior:

- always scopes to bachelor’s-dominant institutions
- uses live College Scorecard data on the server
- major/program search uses a controlled CIP-4 picker
- URL query params are the source of truth for search state
- `selected=<scorecardSchoolId>` swaps the featured preview without leaving the page
- when a current family list exists, the selected preview can be added directly to that list

## `/analytics`

Audience:

- strategist
- ops

Layout:

- editorial analytics hero
- sticky filter rail for school, intended major, GPA, SAT, and ACT
- accepted versus rejected summary band
- school landscape roster
- school-specific scatter plot and applicant drill-down roster when a university is selected

Behavior:

- internal-only and file-backed from the local normalized Collegebase export
- URL query params are the source of truth for the search state
- averages use applicant-level SAT, ACT, and unweighted GPA
- waitlists do not count toward accepted versus rejected comparisons
- applicant drill-down opens a dedicated extracted-profile page because the source data has no student names

## `/students/new`

Audience:

- strategist
- ops

Behavior:

- if no family is preselected, first show a family chooser
- if a family is preselected, show the full student create form
- redirect to the new student portfolio on success

## `/students/[id]`

Audience:

- strategist
- ops

Layout:

- left identity rail
- top metric cards
- modular strategy cards in the main workspace

Sections:

- narrative summary
- testing profile and school-fit workbench
- academic and tutoring status
- profile and project progress
- activities and leadership
- competitions and awards
- school list
- tasks and deadlines
- student decisions
- notes
- artifacts
- prior monthly summaries
- shared family context

Behavior:

- this is the main deep-work surface for student strategy
- inline forms are tucked into focused composer areas, not shown first
- school-fit guidance is deterministic, not AI-driven

## `/portal`

Audience:

- parent

Layout:

- calmer, summary-first version of the household workspace
- grouped by student
- family-wide shared context below the student sections

Sections per student:

- executive summary
- next actions
- academic snapshot
- profile snapshot
- upcoming visible deadlines
- open decisions
- visible resources
- prior monthly summaries

Household-level sections:

- family-wide decisions when parent-visible
- family-wide resources when parent-visible

Parent-only constraints:

- no internal notes
- no internal summary notes
- no non-parent-visible tasks or artifacts
- no sibling internal-only data leaks
