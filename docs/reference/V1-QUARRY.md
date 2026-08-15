# The V1 quarry

V1 is proven code, not a specification. This file says what is worth taking and what is not, so nobody has to read the whole thing to find out.

## Where it is

The V1 working tree sits beside this worktree at `../RELIC v1`, checked out on `codex/initial-web-app`. It carries ~169 uncommitted changes including the partial V2 migration — **read it, never run git commands inside it.**

From this worktree, V1 history is reachable directly:

```bash
git show codex/initial-web-app:apps/web/lib/v2/types.ts
```

Uncommitted V1 files (the newest V2 migration work) are not in history — read them from the filesystem at `../RELIC v1/...`.

## Worth taking

**`apps/web/lib/v2/types.ts`** (uncommitted in V1). The best artifact of the migration. It already models opaque IDs, lifecycle, visibility, truth state, provenance, representations, and — importantly — `V2CompositionProjection` / `V2CompositionItemReference`, which get the composition-owns-layout-not-truth seam right. Take the shapes. Leave the `V2*` prefix; in V2 these are just the domain.

**`apps/web/lib/v2/server.ts`** (uncommitted). Server-side repository boundary: routes pass opaque IDs, the server re-resolves scope with the authenticated actor. The *pattern* is right and should survive. Its Supabase specifics belong to the auth slice, not to slice 1.

**`supabase/migrations/20260813*_v2_*.sql`** (uncommitted, 7 files). Real thinking about world objects, claims, events, compositions, change sets, and a one-writer gate. Read them when designing the durable schema. Do not replay them — they chain onto 70 prior V1 migrations and drag the whole V1 schema with them.

**`apps/web/lib/stage-*.ts`.** Browser-side Stage recovery. Genuinely hard problem, already solved. Revisit at the Stage slice.

**`supabase/security/rpc-boundary.md`.** The record of what is callable from the browser. Useful precedent when V2 grows a server boundary.

**Long-form vision** — `docs/Relic V2/Relic V2 Phase 0 Architecture Decisions.md` (the ADRs), `Relic V2 Beta Fixture Specification.md`, `Relic V2 Beta Reset Plan.md`, and the `Relic Vault/` contracts. Consult when a durable decision needs prior art. These are *not* authority in V2 — the six root direction files are. An unresolved conflict is a question for the orchestrator, not a blocker.

## Not worth taking

- The phase/packet/gate delivery machinery. V2 builds vertical slices.
- `components/relic-draft/` and the deleted Claude Design exports.
- Migration adapters, backfill writers, one-writer cutover flags, and dual-write seams. That machinery existed to transform V1 in place. V2 is not doing that.
- The V1 route hierarchy (`workspace → world → saga` path segments) as-is. The *scoping idea* is sound; the URL and loader shape should be redecided when V2 has multi-tenancy.
- `services/litellm/`, the phase-E/F/G smoke scripts, and the hosted-gate operator tooling. Revisit only when the Librarian slice needs a provider.

## Rule

Take the solved problem. Leave the scaffolding that made it fit V1.
