# BeGifted Dashboard Agent Instructions

## Product truth

- Treat files in [`docs/`](./docs) as the product source of truth.
- If code and docs disagree, update code to match docs unless the user explicitly changes the product decision.
- Keep the MVP cross-pathway at the schema level, but optimize seed/demo data and launch flows for US college.

## Stack and architecture

- Frontend: Next.js App Router with server-first components.
- Backend target: Supabase Auth + Postgres.
- Default local runtime: demo mode when Supabase env vars are absent.
- Domain logic belongs in [`lib/domain`](./lib/domain), not inside page files.
- Validation belongs in [`lib/validation`](./lib/validation).
- Reporting helpers belong in [`lib/reporting`](./lib/reporting).

## Naming and modeling

- Use explicit names: `family`, `monthlySummary`, `decisionLogItem`, `artifactLink`.
- Keep parent-visible and internal-only fields clearly separated in names and validation.
- Prefer enum-like unions over free-form strings for roles, statuses, note types, and pathways.

## Database workflow

- Put schema changes in new SQL files under [`supabase/migrations`](./supabase/migrations).
- Keep migrations additive when possible.
- Document any schema changes in [`docs/data-model.md`](./docs/data-model.md).
- Preserve row-level-security intent: parents can only read their own family’s parent-safe data; strategists can read assigned families; ops has global internal access.

## UI and access rules

- Internal routes live under `/dashboard`, `/families`, and future operational modules.
- Parent routes live under `/portal`.
- Never surface internal-only notes, internal summary notes, or non-parent-visible tasks/artifacts in parent views.
- Family detail pages should remain single-scroll operational cockpits, not tab-heavy admin screens.

## Quality bar

- Prefer implementation that works in demo mode and has a clear upgrade path to live Supabase data.
- Add or update tests whenever visibility, filtering, reporting history, or validation rules change.
- Keep the interface editorial and premium. Avoid generic admin defaults or dark-mode-only design.
