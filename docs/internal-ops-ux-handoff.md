# Internal Ops UX/UI Audit and Designer Handoff

## Summary

This handoff focuses on the internal operations experience first: [`/dashboard`](../app/dashboard/page.tsx), [`/families`](../app/families/page.tsx), and [`/families/[id]`](../app/families/[id]/page.tsx). The current product already has a strong warm editorial base, but the internal surfaces still read more like stacked admin cards and inline forms than a premium case-management cockpit.

The core UX issue is consistent across the internal routes: the product often combines case reading, triage, and editing on the same surface. That weakens urgency scanning, pushes the most important signals below verbose content, and makes it harder for strategists and ops leads to decide what needs attention next.

FigJam handoff board:
[BeGifted Internal Ops UX Handoff](https://www.figma.com/online-whiteboard/create-diagram/deaa9354-9a7c-4dfe-b8a3-7e436f4707ae?utm_source=other&utm_content=edit_in_figjam&oai_id=&request_id=7b54c163-71bf-4997-998a-b55c5b664c88)

## Prioritized Findings

1. The family cockpit mixes reading and editing too early.
   The current family page places large edit forms directly inside the primary reading flow for summaries, academic updates, profile updates, tasks, decisions, notes, and artifacts. Users encounter input fields before they finish understanding case posture, which increases cognitive load and weakens single-scroll scanning.

2. The family list emphasizes narrative cards over operational roster scanning.
   The current `/families` view uses large stacked cards with multiple full sentences. That works for browsing a small demo cohort, but it slows down comparison across families and makes urgent work harder to rank visually.

3. The dashboard contains the right data but the urgency hierarchy is still too flat.
   The dashboard already surfaces urgent families and upcoming work, but the visual contrast between urgent modules and secondary modules is small. The page feels balanced rather than triaged.

4. Internal and parent surfaces are not visually separated enough at the system level.
   The current shared shell and card language create consistency, but they do not strongly signal when a user is in an internal operational surface versus a parent-safe summary surface.

## Route Recommendations

### `/dashboard`

- Keep the hero strip short and role-aware: mode, scope, and one sentence on current workload posture.
- Limit the KPI band to four cards only: active families, urgent families, overdue items, parent-visible due soon.
- Make the urgent family queue the dominant module on the page.
- Keep upcoming deadlines adjacent to the urgent queue so the user can connect case urgency with concrete next work.
- Move reporting posture and data hygiene modules lower and reduce their visual weight.
- Use stronger urgency styling for red and overdue signals: denser cards, higher contrast borders, and tighter copy.

### `/families`

- Replace the current card-heavy layout with a scan-first roster on desktop.
- Keep the filter bar sticky and lightweight; search, status, and deadline window should feel fastest.
- Standardize each row to: student, status, strategist, next due, biggest risk, pending decisions, overdue count, last updated, CTA.
- Preserve a compact stacked mobile card, but keep the same information order.
- Keep narrative details secondary and truncatable so the user can compare multiple families without reading paragraphs.

### `/families/[id]`

- Treat the page as a cockpit, not as a form collection.
- Keep the top section read-only and posture-first:
  - status and status reason
  - biggest win and biggest risk
  - top three next actions
  - pending family-input decisions
  - overdue or next critical deadline
  - last updated metadata
- Add a sticky anchor rail for Overview, Current Summary, Academic, Profile, Tasks, Decisions, Notes, Artifacts, and Archive.
- Consolidate overdue tasks and pending family-input decisions into a shared “Attention now” module near the top.
- Convert inline editing into on-demand actions:
  - `Edit summary`
  - `Add task`
  - `Log note`
  - `Add artifact`
- Keep section bodies primarily read-only by default, with editing moved into focused drawers, panels, or dedicated composer areas revealed only when requested.
- Push prior monthly summaries into a clearly separate archive zone at the bottom.

### `/portal`

- Keep the parent portal calmer and more summary-first than internal pages.
- Remove visible internal operational tone from hero framing.
- Preserve concise next actions, family-input decisions, and deadlines, but avoid visually signaling internal severity states.

## Shared UI Direction

- Keep the current warm, editorial, premium direction; do not replace it with a generic SaaS visual language.
- Increase contrast between module types:
  - urgent operational modules
  - neutral summary modules
  - editing/composer modules
  - archive/history modules
- Group global navigation by audience so internal routes and parent routes feel intentionally distinct.
- Standardize status-chip usage so case health, task state, and parent visibility do not compete visually.
- Tighten spacing rhythm so the interface feels more curated and less like evenly weighted cards.

## Low-Fidelity Wireframe Intent

### Dashboard

- Header strip with mode, role scope, and workload sentence.
- One row of four KPI cards.
- Two-column main body:
  - left: urgent family queue
  - right: upcoming deadline map
- Secondary row:
  - reporting posture
  - data hygiene/completeness

### Families

- Sticky filter bar.
- Column headers on desktop.
- Compact roster rows with one primary CTA.
- Mobile fallback as stacked compact cards.

### Family Cockpit

- Sticky section anchors.
- Read-only overview above the fold.
- Shared “Attention now” module before deep sections.
- Read-first section cards with per-section action buttons.
- Archive zone visually separated from current-month posture.

## Review Scenarios

- An ops user can identify the top urgent family and next due item within five seconds on `/dashboard`.
- A strategist can compare multiple families on `/families` without opening each family.
- A user can understand case posture on `/families/[id]` before seeing any form fields.
- Pending family-input decisions and overdue tasks appear near the top of the family cockpit.
- The portal feels visibly calmer and less operational than internal pages.
