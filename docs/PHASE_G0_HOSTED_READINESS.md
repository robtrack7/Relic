# Phase G0 Hosted Readiness

Status: **local/database prerequisites complete; web staging and dashboard toggle blocked on hosted-console authentication**

Project: `relic-staging` (`scagegrrilvrpuilthzz`)
Date: 2026-08-05

This checkpoint contains no provider call, private fixture content, or credential value.

## Completed

- Promoted the complete Phase F migration order to hosted staging, followed by `20260805223226_phase_g0_hosted_hardening.sql`.
- Revoked authenticated access to the obsolete one-argument `update_notification_preferences(jsonb)` overload.
- Changed the four advisor-reported auth policies to init-plan-safe `(select auth.uid())` checks.
- Added twelve narrow foreign-key indexes for the import/Session/synthesis/Saga-cleanup paths exercised by Phase G.
- Replayed the complete local schema and passed all 40 pgTAP files / 1,151 assertions.
- Strengthened the callable-function contract so tests prove exact authenticated signature cardinality, not only an allowed function name.
- Generated the 19-file synthetic import/attachment matrix twice and proved byte-identical manifests, including a valid-PDF-plus-appended-image polyglot sentinel.
- Parsed and inspected the textual, blank, image-only, encrypted, active-content, embedded-file, page-limit, byte-limit, MIME-mismatch, and image-dimension sentinels. The valid and image-only PDFs were rendered and visually inspected.

Generate the corpus with:

```powershell
python -m pip install -r scripts/requirements-phase-g-fixtures.txt
pnpm phase-g:fixtures
```

The default output is ignored local state at `.tmp/phase-g-fixtures`. The generator replaces only regular files inside its exact output directory and refuses unexpected subdirectories.

## Advisor reconciliation

| Advisor set | Before G0 | After G0 | Disposition |
|---|---:|---:|---|
| Auth RLS init-plan warnings | 4 | 0 | Closed. |
| Unindexed foreign keys | 117 | 105 | Twelve release-spine paths closed; remaining candidates stay for measured G5 query-plan review. |
| Auth-executable `SECURITY DEFINER` warnings | 99 | 98 | Obsolete overload removed; remaining signatures match the exact documented scoped surface. |
| RLS enabled/no policy | 1 | 1 | Intentional service-only `approval_action_receipts`; no browser grants. |
| Leaked-password protection | 1 | 1 | Dashboard/plan setting; see blocker below. |
| Unused indexes | 16 | 28 | Expected immediately after adding twelve indexes; no blind removal before G5 traffic/query-plan evidence. |

## Open hosted blockers

1. **Supabase leaked-password protection:** the available browser sessions are not authenticated to the Supabase dashboard. The application/database safety work is complete, but the Pro-plan Auth setting cannot be toggled without an authenticated project console session.
2. **Web staging:** the repository has no Vercel project link, Vercel CLI credential, Vercel configuration, GitHub deployment, or connected deployment status. The CLI is available, but authentication is not. No hosting project or billable infrastructure was guessed or created.

These blockers do not prevent local G1 implementation or database tests. They do prevent declaring the G0 hosted gate complete and must be resolved before G2 staging acceptance.

## Subsequent G1 PDF checkpoint

The trusted PDF migration and `extract-import-pdf` Edge function are now deployed to the locked staging project. The function is active with JWT verification and a 499.1 kB bundle. A cleanup-proven ten-case runtime matrix passed both locally and on hosted staging: textual extraction succeeded, while empty, image-only, encrypted, active-content, embedded-file, over-page-limit, malformed, MIME-mismatched, and true polyglot fixtures reached their exact safe rejection codes. This closes only the PDF slice; it does not close the G0 web-host/dashboard blockers or the remaining G1 attachment, enrollment, tag/status, and Stage-reference work.

## Cost and secret state

- OpenAI calls made by G0: `0`.
- Phase G cumulative provider cost consumed by G0: `$0`.
- The user-authorized provider credential remains only in ignored, access-restricted local provider state.
- No secret was printed, copied into browser state, written to fixtures, committed, or added to this report.
