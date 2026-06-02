# Relic

Relic is Game Master software for the MVP loop: Create -> Organize -> Prep -> Run -> Review -> Approve -> Continue.

## Canonical Specs

Start every task at `Relic Vault/00 - Start Here.md`. Treat `Relic Vault` as canonical. Treat `Sourced - Downloaded - 260518` as a read-only import snapshot if present.

## Repository Layout

- `apps/web` - future Next.js App Router app for the Sanctum and web Stage fallback.
- `apps/mobile` - future Expo Router app for Stage-first mobile and Sanctum-lite.
- `packages/core` - shared Relic domain constants and MVP-safe types.
- `packages/config` - shared tooling configuration.
- `supabase` - migrations, Edge Functions, tests, and fixtures.
- `services/litellm` - LiteLLM proxy config and deployment notes.
- `scripts` - repository checks and setup helpers.
- `Relic Vault` - canonical product, architecture, UX, and planning specs.

## Current State

This repository has the bootstrap and foundation substrate for the MVP. AI task contracts are specified in `Relic Vault/23 - AI Task Registry.md`, but AI task surfaces must not be coded until the AI runtime implementation plan is accepted.

## Verify

```bash
node scripts/verify-repo.mjs
```

## Web App

The initial web app lives in `apps/web` and implements the manual Sanctum spine:
auth, bootstrap, Start Blank, manual canon CRUD, session prep, browser Stage
fallback, Review shell, Search shell, and lightweight settings.

For Figma-to-React handoff work, use `docs/ui-figma-import.md` and
`Relic Vault/73 - Figma UI Import Readiness.md`. Import one route or component
family at a time, keep existing loaders/actions in place, and adapt generated
React to the backend contracts before replacing live UI.

Install dependencies and run local web checks with pnpm:

```bash
npx pnpm@10.11.0 install
npx pnpm@10.11.0 --filter @relic/web dev
npx pnpm@10.11.0 --filter @relic/web test
npx pnpm@10.11.0 --filter @relic/web build
```

For the Playwright smoke test, build first, start the web app, then run the
test in another terminal:

```bash
cd apps/web
node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3000
node_modules/.bin/playwright test
```

Required web environment values:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local anon or publishable key>
```

The web app must not use service-role keys, provider SDKs, live AI task routes,
prompt templates, or model-provider calls in this phase. AI-dependent UI is
disabled or routed to manual alternatives until the AI runtime implementation
plan is accepted.

## Supabase Foundation

Foundation migrations live in `supabase/migrations` and are ordered by responsibility:

1. extensions and enums
2. Workspace / World / Era / Saga hierarchy
3. canon entities, notes, sources, drafts, audit, embeddings
4. sessions, transcripts, audio, pipeline evidence
5. usage, quota, and internal job queues
6. Storage buckets
7. RLS helpers, policies, bootstrap, quota RPCs
8. retrieval profiles and retrieval/search RPCs
9. production-safe fixture contract view

Run the SQL test harness with Supabase CLI:

```bash
supabase start
npm run test:supabase
supabase stop --no-backup
```

The SQL fixtures in `supabase/fixtures/foundation.sql` create two users, two Workspaces, sibling Sagas, scoped canon, drafts, quota edge cases, and storage path edge cases for the foundation tests.
