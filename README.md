# BeGifted Dashboard MVP

Operational dashboard MVP for BeGifted’s family case-management workflow, built with Next.js App Router and designed to evolve into a Supabase-backed internal tool plus read-only parent portal.

## Stack

- Next.js 16 + React 19
- Tailwind CSS 4
- Supabase Auth + Postgres schema under [`supabase/`](./supabase)
- Zod validation under [`lib/validation`](./lib/validation)
- Demo-first data layer so the UI runs before a live Supabase project is attached

## Repo map

- [`docs/PRD.md`](./docs/PRD.md): build-ready product spec
- [`docs/data-model.md`](./docs/data-model.md): schema, enums, visibility, RLS intent
- [`docs/screens.md`](./docs/screens.md): route-by-route UI requirements
- [`docs/workflows.md`](./docs/workflows.md): operational workflows and acceptance rules
- [`docs/backlog.md`](./docs/backlog.md): MVP cut line and post-pilot backlog
- [`supabase/migrations/20260310_initial_schema.sql`](./supabase/migrations/20260310_initial_schema.sql): initial database schema
- [`supabase/seed.sql`](./supabase/seed.sql): realistic pilot-family seed set

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Start the app:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

Without Supabase environment variables, the app runs in demo mode using seeded fixture data. That keeps the UI, tests, and documentation usable before infrastructure is connected.

To enable live college search on the internal `/colleges` explorer, add `COLLEGE_SCORECARD_API_KEY` to `.env.local`. The key is server-only and should not be exposed client-side.

## Supabase setup

1. Create a Supabase project.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`.
3. Apply SQL from the migration files under [`supabase/migrations`](./supabase/migrations), including the family college workspace additions.
4. Load [`supabase/seed.sql`](./supabase/seed.sql) if you want pilot demo records.
5. Optionally add `COLLEGE_SCORECARD_API_KEY` if you want live College Scorecard results on `/colleges`.
6. Configure magic-link redirects to include:
   - `http://localhost:3000/auth/callback`
   - your deployed site callback URL

## Commands

- `npm run dev`
- `npm run lint`
- `npm run test`
- `npm run typecheck`
- `npm run build`

## Product defaults

- Parent access is login-based, not shared-link based.
- Google Drive remains the source of truth for files; the app stores links and metadata only.
- Only strategist and ops are direct editors in MVP.
- Monthly reporting is stored as one summary record per family per month.
- The schema is cross-pathway, but the pilot launch content is US college only.
- College exploration lives on the internal-only [`/colleges`](http://localhost:3000/colleges) route and can attach results directly to a family school list.
- The family workspace now includes a College research and school list workbench for US-college advising.
