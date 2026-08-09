# Relic

Relic is Game Master software for the MVP loop: Create -> Organize -> Prep -> Run -> Review -> Approve -> Continue. The web app contains The Sanctum and The Stage.

## Start with the right contract

Read [00 - Start Here](<Relic Vault/00 - Start Here.md>) first, then load only the relevant compact contract:

- [10 - Product Contract](<Relic Vault/10 - Product Contract.md>) — scope, language, and MVP boundaries.
- [20 - Engineering Contract](<Relic Vault/20 - Engineering Contract.md>) — schema, RLS, RPCs, workers, AI, and trusted data paths.
- [30 - Experience Contract](<Relic Vault/30 - Experience Contract.md>) — routes, surfaces, design, and UX behavior.
- [40 - Delivery Status](<Relic Vault/40 - Delivery Status.md>) — active work and release gates.
- [45 - Security Findings Register](<Relic Vault/45 - Security Findings Register.md>) — security controls and operational risks.
- [05 - Deferred Decisions](<Relic Vault/05 - Deferred Decisions.md>) — intentional exclusions.

`AGENTS.md` is the concise implementation guide. Historical vault material, Claude/Figma exports, session logs, and build output are reference-only unless a task explicitly requires them.

## Layout

- `apps/web` — Next.js web application.
- `supabase` — migrations, Edge Functions, database tests, fixtures, and RPC boundary documentation.
- `scripts` — repeatable verification and local operator helpers.
- `docs/operations.md` — hosted-operation and smoke-test guardrails.

## Commands

Requires Node 22+ and `pnpm@10.11.0`.

```bash
npx pnpm@10.11.0 install
npx pnpm@10.11.0 verify
npx pnpm@10.11.0 test:scripts
npx pnpm@10.11.0 --filter @relic/web lint
npx pnpm@10.11.0 --filter @relic/web test
npx pnpm@10.11.0 --filter @relic/web build
```

For database work, use the documented Supabase commands and run the focused SQL tests before broader baseline checks. For visual imports, use [docs/ui-figma-import.md](docs/ui-figma-import.md) and adapt one route or component family at a time.
