---
status: active
authority: secondary
scope: planning
read_after:
  - "[[40 - MVP Implementation Planning Sequence]]"
depends_on:
  - "[[21 - Tech Architecture]]"
  - "[[34 - UI Implementation Spec]]"
  - "[[41 - Foundation Implementation Plan]]"
supersedes: []
last_audited: 2026-05-20
source_file: "Relic Vault/44 - Repo Bootstrap and GitHub Setup Plan.md"
---

# Repo Bootstrap and GitHub Setup Plan

## Goal

Create the Relic MVP repository structure, local tooling baseline, and GitHub guardrails before foundation implementation begins.

## Position In Sequence

This plan runs before [[41 - Foundation Implementation Plan]]. It does not replace the foundation plan; it creates the folders, scripts, and repository conventions needed to execute it without inventing structure during feature work.

## Locked Decisions

- Repository shape: pnpm monorepo.
- Runtime baseline: Node 22 LTS.
- App folders: `apps/web` for the first full Sanctum/Stage implementation; `apps/mobile` for the later mobile implementation of both surfaces after the web loop is stable.
- Shared code folders: `packages/core` for Relic domain constants/types and `packages/config` for shared tooling config.
- Supabase folders: `supabase/migrations`, `supabase/functions`, `supabase/tests`, and `supabase/fixtures`.
- AI proxy config folder: `services/litellm`.
- Planning/spec authority remains in `Relic Vault`.
- `Sourced - Downloaded - 260518` remains a read-only import snapshot if present.

## Initial Folder Responsibilities

| Path | Responsibility |
|---|---|
| `apps/web` | Future Next.js App Router implementation for Sanctum, Stage, auth, Approval Queue, settings, and export surfaces. |
| `apps/mobile` | Future Expo Router implementation for mobile Relic: Sanctum, Stage, notifications, and offline packet behavior. |
| `packages/core` | Shared MVP-safe domain names, route constants, hierarchy types, AI task identifiers, and scope guards. No provider SDK calls. |
| `packages/config` | Shared TypeScript, lint, formatting, and test configuration once dependencies are installed. |
| `supabase/migrations` | Ordered SQL migrations for schema, RLS, storage policies, indexes, functions, and seed-safe enum creation. |
| `supabase/functions` | Supabase Edge Functions for scoped backend actions, queues, retrieval, exports, notifications, and later AI runtime tasks. |
| `supabase/tests` | RLS, migration, retrieval, quota, storage, and job behavior tests. |
| `supabase/fixtures` | Minimal fixture data for two users, sibling Sagas, cross-Workspace denial, and retrieval evals. |
| `services/litellm` | LiteLLM proxy config and deployment notes. No secrets committed. |
| `scripts` | Repository validation, type generation, and local setup helpers. |
| `.github` | CI workflow, pull request template, and issue templates. |

## GitHub Baseline

- Default branch: `main`.
- Initial remote: `origin` should point at the project GitHub repository.
- Pull requests should use the repository PR template.
- CI should run a lightweight repository verification command immediately, then expand to install, lint, typecheck, tests, and build as apps are created.
- Secrets are not required for the bootstrap commit.
- Future required secrets: Supabase project values, LiteLLM proxy token, provider keys, Resend key, Expo credentials, Sentry/PostHog keys.

## Bootstrap Steps

1. Initialize Git locally if `.git` is absent.
2. Add `origin` for the GitHub repository.
3. Create root repository files: `.gitignore`, `.editorconfig`, `.nvmrc`, `package.json`, `pnpm-workspace.yaml`, `.env.example`, and `README.md`.
4. Create empty implementation folders with README guardrails.
5. Add `.github/workflows/ci.yml`, `.github/pull_request_template.md`, and an implementation issue template.
6. Add `scripts/verify-repo.mjs` to validate the expected structure and prevent accidental AI surface implementation before the accepted AI runtime phase.
7. Commit the bootstrap.
8. Push `main` to GitHub.

## What Is Safe To Scaffold Now

- Repository and workspace metadata.
- Folder structure.
- README files and contribution guardrails.
- Verification scripts.
- CI skeleton.
- Empty Supabase migration/test/function folders.
- Empty app/package folders with explicit ownership notes.

## What Must Not Be Scaffolded Yet

- Live AI task routes, prompt execution, or model-provider calls.
- UI buttons that invoke real AI tasks.
- Prompt templates beyond task identifiers and versioning conventions.
- Supabase migrations that encode unreviewed schema details.
- App dependencies or generated boilerplate that imply a frontend architecture beyond the locked stack.
- Secrets, production environment values, or provider credentials.

## Exit Criteria

- `git status` works in the workspace.
- `origin` points to the intended GitHub repository.
- Root verification script passes.
- GitHub CI exists and calls the verification script.
- Source map references this plan.
- No AI task surface implementation exists.
