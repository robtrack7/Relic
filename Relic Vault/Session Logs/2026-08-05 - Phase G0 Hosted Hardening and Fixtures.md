---
status: partial
scope: session-log
date: 2026-08-05
---

# Phase G0 Hosted Hardening and Fixtures

Back to [[50 - Session Log Index]].

## Accomplished

- Promoted the complete Phase F migration order and the G0 hardening migration to `relic-staging`.
- Removed one obsolete authenticated RPC overload, optimized four auth RLS policies, and indexed twelve Phase G release-spine foreign keys.
- Strengthened the browser-callable function audit to enforce exact authenticated signature counts.
- Added a deterministic generator for the 19-file text/Markdown/PDF/JPEG/PNG/WebP adversarial matrix, including a true PDF polyglot.
- Generated the matrix twice, compared complete manifests, parsed its rejection sentinels, and visually inspected the rendered textual and image-only PDFs.
- Recorded the hosted checkpoint in `docs/PHASE_G0_HOSTED_READINESS.md` without secrets.

## Verification

- Clean local schema replay succeeded through `20260805223226_phase_g0_hosted_hardening.sql`.
- All 40 database test files / 1,151 pgTAP assertions passed.
- Post-deploy advisors report zero auth RLS init-plan warnings and twelve fewer unindexed foreign keys.
- Fixture manifest is byte-identical across two clean generations; all 19 expected files passed structural checks.
- G0 made zero OpenAI calls and consumed `$0` of the Phase G provider budget.

## Open follow-ups

1. Authenticate a Supabase project-console session and enable leaked-password protection if the staging plan exposes it.
2. Authenticate/link the approved web host and publish a reachable staging deployment.
3. Continue local G1 implementation; do not declare G0 or start G2 hosted acceptance until the two console/hosting blockers close.
