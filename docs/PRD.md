# BeGifted Dashboard MVP PRD

## Summary

BeGifted needs an internal consulting cockpit that is student-first operationally and family-scoped administratively. The household is the parent-facing container, but the strategist and ops team should work primarily at the student portfolio level.

This MVP still runs on Next.js App Router plus Supabase Auth/Postgres, still protects parent-safe visibility, and still avoids replacing every external spreadsheet or document workflow. The major product shift is multi-student family support with native family and student creation inside the app.

## Product decisions locked for MVP

- Stack: Next.js + Supabase.
- Household model: `family` is the container, `student` is the operating unit.
- Parent access: login-based portal using magic-link authentication.
- Internal create flows:
  - create family + first student
  - add student to existing family
- Artifact source of truth: Google Drive links only.
- Editors: strategist and ops only.
- Parent portal stays read-only and parent-safe.
- Data entry: manual entry only; no CSV import in MVP.

## Core outcomes

### Internal

A strategist or ops lead should be able to:

- triage urgent students from `/dashboard`
- compare households quickly on `/families`
- open `/families/[id]` for household context and coordination
- query extracted admissions outcomes on `/analytics`
- open `/colleges` for live College Scorecard research
- open `/students/[id]` for deep strategy work on one student
- create families and add students without leaving the app

### Parent-facing

A parent should be able to:

- log in to one household portal
- view progress grouped by student
- see only parent-visible summaries, deadlines, decisions, and resources
- review prior monthly summaries without seeing internal notes or internal-only records

## Users and permissions

### Strategist

- Can view and edit assigned families and their students.
- Owns roadmap quality, summary quality, testing/school-list strategy, and decision logging.

### Operations

- Can view and edit all families and students.
- Owns dashboard hygiene, deadline maintenance, and completeness checks.

### Parent

- Can view exactly one family in MVP.
- Can see parent-safe data grouped by student.

### Explicitly out of scope

- Student login
- Tutor/mentor direct editing
- AI recommendations
- CSV import
- Billing, messaging, or Drive sync

## MVP modules

### Internal dashboard

- Student-first command center
- Four KPI cards
- Priority student queue
- Cross-student deadline map
- Deterministic testing-to-school-fit guidance

### Family workspace

- Household overview
- Student roster
- College strategy profile and named school-list workbench
- Family-wide pending decisions
- Family-wide notes and resources

### College explorer

- Internal-only College Scorecard explorer
- Server-side search across bachelor’s-dominant institutions
- Controlled CIP-4 major filtering
- Direct add-to-list flow when opened in family context

### Applicant analytics

- Internal-only Collegebase analytics workspace
- File-backed querying by school, intended major, GPA, SAT, and ACT
- Accepted versus rejected averages at the filtered school view
- School-specific SAT/ACT versus GPA scatter plot
- Dedicated extracted-profile drill-down for underlying applicant records

### Student 360 portfolio

- Monthly summary and positioning
- Testing profile
- Activities and leadership
- Competitions and awards
- School target list
- Academic and tutoring update
- Profile/project update
- Tasks, decisions, notes, and artifacts

### Parent portal

- Student-grouped monthly summaries
- Parent-visible tasks and decisions
- Parent-visible resources
- Prior summaries per student
- Shared household context when parent-visible

## Definition of done

The MVP is ready for pilot when:

- internal staff can create and maintain multi-student family workspaces
- strategists can search live bachelor’s-degree institutions without leaving the app
- dashboard triage is student-first
- family and student routes have clear roles instead of overlapping responsibilities
- parent portal remains safely scoped and grouped by student
- demo mode includes at least one multi-student household
