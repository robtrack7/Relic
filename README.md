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

This repository is bootstrapped for implementation planning. AI task contracts are specified in `Relic Vault/23 - AI Task Registry.md`, but AI task surfaces must not be coded until the AI runtime implementation plan is accepted.

## Verify

```bash
node scripts/verify-repo.mjs
```
