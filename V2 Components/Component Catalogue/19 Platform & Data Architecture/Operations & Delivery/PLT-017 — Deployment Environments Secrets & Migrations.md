---
id: PLT-017
status: active
kind: platform
authority: current
system: SYS-19
family: operations-delivery
storybook: none
---

# PLT-017 — Deployment Environments Secrets & Migrations

Parent: [[SYS-19 — Platform & Data Architecture]]

## Purpose

Defines reproducible deployment, secret handling and schema evolution so environment/admin shortcuts do not undermine the platform contracts.

## Environments

Maintain separate development, staging and production environments/projects.

Do not use tenant IDs inside one production database as a substitute for proper dev/staging isolation.

## Deployment targets

Current stack:
- Next.js web deployment;
- Supabase backend;
- independently deployable LiteLLM routing service.

Future mobile delivery can add EAS/Expo without changing current web deployment contracts.

Exact hosting provider for routing/workers can change.

## Secrets

Never ship privileged provider/database secrets in:
- browser bundles;
- future native/mobile bundles;
- public database tables.

Managed provider keys live in server/environment secret management. Future BYOK secrets require encrypted/revocable server-side storage and must never be returned to ordinary clients.

## Migrations

All schema, RLS, function and relevant index changes live in source-controlled migrations.

Production dashboard edits that cannot be reproduced from source are not an accepted workflow.

## Generated types

Regenerate/check database client types after schema changes and keep application/domain adapters explicit.

## Migration tests

Migration CI should run at least:
- apply from clean database;
- generated type validation;
- RLS/security tests;
- core transaction/temporal tests;
- seed smoke tests.

## Seeds

Maintain non-user seed/fixtures for:
- first-party Mechanics Templates;
- development Saga;
- retrieval evaluation;
- temporal/RLS fixtures.

## Flexibility

Deployment vendor details, worker host and secret backend may evolve. Reproducibility, environment isolation, source-controlled migrations and client-secret exclusion are hard.

## Handoff

Make the local/staging setup reproducible enough that coding agents can test migrations and RLS rather than relying on undocumented remote project state.
