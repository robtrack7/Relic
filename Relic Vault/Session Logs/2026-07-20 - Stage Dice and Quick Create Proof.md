---
status: complete
authority: support
scope: session-log
read_after:
  - "[[50 - Session Log Index]]"
depends_on:
  - "[[00 - Start Here]]"
  - "[[32 - Stage UX Flow]]"
  - "[[66 - Stage Design Spec]]"
supersedes: []
last_audited: 2026-07-20
source_file: "Relic Vault/Session Logs/2026-07-20 - Stage Dice and Quick Create Proof.md"
---

# Stage Dice and Quick Create Proof

## Accomplished

- Closed MVP delivery Packet A2 without changing the five-button Stage rail, route hierarchy, or wireframe structure.
- Proved Normal, Advantage, and Disadvantage d20 rolls through the scoped action path and retained the chosen Advantage mode when the pool was pinned.
- Exercised NPC, Location, Item, Thread, Note, and Faction through Create and refresh-proved their Library type/stub semantics.
- Preserved the GM's chosen Create → Note title by extending `quick_capture` with an optional title while retaining timestamp titles for ordinary Quick Note calls.
- Kept the canon boundary intact: the five entity types remain GM-authored canon stubs with manual source/audit provenance; Note remains session-linked quick-capture evidence.
- Added validation, pending-write duplicate suppression, permission-failure recovery, action mapping, RPC, pgTAP, and authenticated browser coverage.

## Changed

- `apps/web/app/actions.ts`
- `apps/web/components/relic-draft/StageRuntimeDraft.tsx`
- `apps/web/tests/dice.test.ts`
- `apps/web/tests/e2e/authenticated-loop.spec.ts`
- `apps/web/tests/security-actions.test.ts`
- `apps/web/tests/stage-dice-create.test.tsx`
- `apps/web/tests/stage.test.ts`
- `supabase/migrations/20260721051205_stage_named_quick_capture.sql`
- `supabase/tests/session_stage.sql`
- `PLAN.md`
- `docs/MVP_GAP_ANALYSIS.md`
- [[66 - Stage Design Spec]]
- [[50 - Session Log Index]]

## Verified

- Web type-check passed.
- Web unit/component suite passed: 14 files, 47 tests.
- Production web build passed.
- Repository verification passed; script/security tests passed: 9 tests.
- Clean local Supabase migration replay passed.
- pgTAP passed: 13 files, 301 tests.
- Database lint completed with only the previously recorded function warnings.
- Authenticated signup-to-Stage loop passed, including all six Create choices, Library refresh, d20 modes, pinned Advantage, Stage reload, and session finalization/undo.

## Follow-ups

- Begin Packet A3: add compact read-only active-Thread visibility without changing the rail.
- Apply restrained top-bar consistency, then repeat four-viewport, keyboard, backdrop, lint, test, build, and authenticated browser gates.
- After Milestone A, continue to Packet B1 for offline intent-queue foundations.
