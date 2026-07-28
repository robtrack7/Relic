---
status: active
authority: secondary
scope: planning
read_after:
  - "[[00 - Start Here]]"
  - "[[46 - Backend Audit and Module Plan]]"
  - "[[47 - Backend Module 0 Baseline Plan]]"
depends_on:
  - "[[20 - Entity and Canon Schema]]"
  - "[[21 - Tech Architecture]]"
  - "[[41 - Foundation Implementation Plan]]"
  - "[[45 - Security Findings Register]]"
  - "[[46 - Backend Audit and Module Plan]]"
supersedes: []
last_audited: 2026-06-01
source_file: "Relic Vault/48 - Backend Module 1 Access Control Plan.md"
---

# Backend Module 1 Access Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:test-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock the browser/backend boundary before product behavior grows by proving public grants, RLS, callable RPCs, and security-definer functions are intentionally scoped.

**Architecture:** Keep the existing public `security definer` RPC pattern for the rough-UI backend milestone, but make it auditable and test-gated. Module 1 adds catalog tests that fail when anonymous execution, broad direct DML, missing `search_path`, or undocumented browser-callable RPCs appear. Any grant fixes are applied in a new terminal migration after tests expose the exact gap.

**Tech Stack:** Supabase PostgreSQL, pgTAP, SQL catalog assertions, Node baseline runner from [[47 - Backend Module 0 Baseline Plan]].

---

## Current Access Boundary Observed

Verified during Module 1 planning on 2026-06-01:

- Earlier migrations grant broad public table DML and function execution to browser roles, then `20260526155312_foundation_security_hardening.sql` revokes direct table writes and grants named RPC execution to `authenticated`.
- Current tests already prove representative anonymous denial, direct write denial, sibling-Saga exclusion, storage-path denial, and scoped RPC validation.
- Public browser RPCs are currently implemented as `security definer` functions in `public`. This is an accepted short-term backend milestone pattern only if each function has fixed `search_path`, explicit ownership/scope checks, and no anonymous execute grant.
- Retrieval functions currently run as definer functions with equivalent scope checks instead of pure RLS inheritance. This remains acceptable for rough UI only when catalog and behavioral tests cover anonymous denial and cross-scope exclusion.
- Module 1 implementation verified `npm run test:supabase` on 2026-06-01 after adding `20260601171914_access_control_boundary.sql`: passed.
- Module 1 final verification ran `npm run backend:baseline:reset` on 2026-06-01: passed.

## Files

- Create: `supabase/tests/access_control.sql`
- Create: `supabase/security/rpc-boundary.md`
- Create if tests expose a grant gap: `supabase/migrations/<timestamp>_access_control_boundary.sql`
- Modify if needed: `supabase/README.md`
- Modify: `Relic Vault/45 - Security Findings Register.md`
- Modify: `Relic Vault/46 - Backend Audit and Module Plan.md`
- Modify: `Relic Vault/02 - Source Map.md`
- Modify: `Relic Vault/04 - Final Contradiction Pass.md`
- Modify at closeout: `Relic Vault/50 - Session Log Index.md`

## Task 1: Add Access-Control Catalog Tests

**Files:**

- Create: `supabase/tests/access_control.sql`

- [x] **Step 1: Write failing catalog tests first**

Add pgTAP tests that assert:

- Anonymous has no execute privilege on the browser RPC allowlist.
- Authenticated has execute privilege only on the browser RPC allowlist and harmless helper functions.
- Public user-data tables expose no direct `insert`, `update`, or `delete` privileges to `anon` or `authenticated`.
- Every `security definer` function in `public` has an explicit `search_path` config.
- Every callable browser RPC appears in the documented allowlist.

- [x] **Step 2: Run only the SQL tests**

Run:

```powershell
npm run test:supabase
```

Result on 2026-06-01: the new tests failed for anonymous function execution, extra authenticated function execution, and anonymous storage write coverage. That drove Task 2.

## Task 2: Fix Grants or Function Metadata

**Files:**

- Create if needed: `supabase/migrations/<timestamp>_access_control_boundary.sql`

- [x] **Step 1: Create a terminal hardening migration if tests fail**

Use:

```powershell
supabase migration new access_control_boundary
```

The migration should be narrow:

- Revoke unintended function execution from `anon`.
- Revoke broad direct table DML from `anon` and `authenticated`.
- Grant only the tested browser RPC/function allowlist to `authenticated`.
- Preserve storage object DML under storage RLS.
- Add or repair `search_path` only where a function is missing it.

- [x] **Step 2: Rerun access-control tests**

Run:

```powershell
npm run test:supabase
```

Result on 2026-06-01: `npm run test:supabase` passed with `access_control.sql` and `foundation.sql`.

Packet E3 catalog extension (2026-07-28): `retrieve_for_task_relaxed` is an authenticated, Saga-access-checked `security definer` RPC used only after registered Guide task retrieval returns no rows for an ordinary natural-language query. It is included in both Module 1 catalogs, has a fixed `search_path`, grants no anonymous access, and returns only current-Saga or eligible World canon with citeable non-import source IDs.

## Task 3: Document the RPC Boundary

**Files:**

- Create: `supabase/security/rpc-boundary.md`
- Modify: `Relic Vault/45 - Security Findings Register.md`

- [x] **Step 1: Add a machine-reviewable boundary document**

Document:

- Browser-callable RPC names and what they own.
- Why each category is `security definer`.
- Required invariants: fixed `search_path`, `authenticated` only, explicit workspace/world/saga check when scoped, no direct browser table writes for canon/session/draft data.
- Accepted short-term deviation: public definer RPCs remain until a dedicated exposed API schema is introduced.

- [x] **Step 2: Update security register**

Close the open local-test follow-up and record the `security definer` placement as an `accepted-risk` with test coverage rather than leaving it as an untracked concern.

## Task 4: Verify the Module 1 Boundary

**Files:**

- Modify: `Relic Vault/46 - Backend Audit and Module Plan.md`
- Modify: `Relic Vault/02 - Source Map.md`
- Modify: `Relic Vault/04 - Final Contradiction Pass.md`

- [x] **Step 1: Run baseline reset**

Run:

```powershell
npm run backend:baseline:reset
```

Expected:

- `npm run test:scripts` passes.
- `npm run verify` passes.
- Web unit tests pass.
- Supabase reset replays all migrations.
- Supabase SQL tests pass, including `access_control.sql`.
- `RELIC_BACKEND_BASELINE_OK` prints.

Result on 2026-06-01: passed.

- [x] **Step 2: Update vault status**

Update the module plan and source map so Module 1 points to this implementation plan and records the verification result.

## Done Criteria

- `supabase/tests/access_control.sql` passes from a clean local reset.
- Catalog tests fail closed for anonymous RPC execution and direct browser DML.
- Every public `security definer` function has a fixed `search_path`.
- The current public definer RPC approach is documented as a short-term accepted risk with explicit invariants.
- `npm run backend:baseline:reset` passes.
- Module 2 can begin with a known browser/backend boundary.
