---
id: IMP-002
status: active
kind: reference
authority: implementation
system: SYS-20
storybook: none
depends_on:
- AUD-001
- PLT-002
- PLT-004
- SYS-18
---

# IMP-002 — Implementation Build Sequence

## Philosophy

Build **vertical slices on top of stable invariants**, not every backend layer first and not every screen independently. Storybook makes visual pieces testable immediately; domain/platform work is added just ahead of the slice that needs it.

The sequence below is a recommended starting route, not a prison. Reorder when real implementation evidence improves the plan.

## Wave 0 — Engineering walking skeleton

Establish only the seams needed for safe iteration:
- Next.js web app and routing/workspace shell;
- Storybook with the same styling/runtime primitives as production;
- local Supabase development, migrations and generated types;
- authentication + Workspace/World/Saga tenancy skeleton;
- RLS test harness from [[PLT-002 — Tenancy Authentication RLS & Security]];
- small domain-validation layer;
- test runners / Playwright / Storybook test integration;
- generated registry index/lint script.

**Manual checkpoint:** app opens, Storybook opens, authenticated dev user can create/read an isolated test Saga, and an RLS negative test demonstrably fails closed.

## Wave 1 — Design foundations + App Shell

Storybook-first:
- DS foundations;
- Button/Icon Button/Text Action/Divider;
- Forms, Menu/Popover/Dialog/Tooltip, status/feedback;
- Global App Shell, Relic Button/Menu, Search entry, Current Context prototype, Profile, Overlay Host, Action Receipt.

Build reference-shell stories before styling every downstream feature.

**Manual checkpoint:** wide/constrained browser review, keyboard navigation, focus/dismissal, no visual-language drift.

## Wave 2 — First real worldbuilding vertical slice

Implement the smallest truthful path:
`minimal New Saga → Desk → Board/Canvas → create Fragment/Character → Card → move/select → Focus → edit → save/reload`

Platform just ahead of the slice:
- core World Object identity/state;
- minimal Story Position/Now contract;
- semantic Change Set/mutation path for meaningful edits;
- Board/Placement persistence;
- optimistic revision/autosave behavior.

Do not wait for the full Chronicle UI or AI before honoring temporal/change-set invariants.

**Manual checkpoint:** build a tiny Saga entirely without AI, reload the browser, and verify identity, placement, Focus edits and audit/current state survive correctly.

## Wave 3 — World model depth, Relationships, Search & Library

Add:
- remaining World Object families/projections and Focus blocks as actual use requires them;
- Relationship model/composer/rows/Canvas edge;
- Search exact/structured/lexical path and Library browsing;
- Source identity/viewer and basic file ingestion;
- resource pickers and cross-object navigation.

Vector retrieval can follow after exact/structured behavior works.

**Manual checkpoint:** build and navigate a representative world, relate objects, search by identity/content, open Source context, and confirm sibling-Saga isolation.

## Wave 4 — Sessions & Prepare

Add Session lifecycle and Prepare:
- Sessions surface/index;
- Prepare workspace/carriage/lens;
- Scene/Beat structure;
- Session context/relevance;
- Stage readiness;
- mechanics profile/template basics needed for the chosen test campaign;
- minimal Session Instance preparation where useful.

**Manual checkpoint:** create Session 1 from the real world, prepare several scenes/context items, close/reopen, and enter a Stage-ready state without AI.

## Wave 5 — Stage manual loop

Implement the live workflow before post-session AI:
- Stage workspace/carriage/Canvas view/entity rail;
- live Scene flow;
- capture/Fragment + Mark Moment;
- Dice engine/UI;
- Encounter Flow + Session Instances + optional live mechanics;
- browser-local crash/offline continuity;
- optional segmented recording/consent;
- End Session boundary.

**Manual checkpoint:** run a mock table Session in the browser, deliberately lose network/reload, continue, and safely End Session with recoverable state.

## Wave 6 — Librarian + retrieval/tool runtime

With real manual domain operations already proven, add AI without giving it special write paths:
- Librarian Carriage/composer/context/citations;
- authorized task retrieval;
- LiteLLM aliases/run ledger;
- semantic tool registry/executor;
- authority/autonomy gate;
- proposal layer + receipts;
- bounded task continuation;
- AI usage traceability.

Start with a few high-value tools over the existing mutation APIs rather than exposing the whole product at once.

**Manual checkpoint:** ask grounded questions, navigate via AI, perform one explicit GM-authored edit, produce one AI-authored proposal, approve/reject it, and verify task/cost/audit trace.

## Wave 7 — Post-session processing + Settlement

Connect the loop:
`End Session → upload/transcribe → interpret → Session Change Set → Settlement → settle/correct/revert`

Add durable queue/pipeline behavior, evidence anchors, Story Change grouping, Summary-first Settlement and protected exceptions.

**Manual checkpoint:** process the mock Stage Session, correct a misinterpretation, settle the Session, verify current world state changed once, then revert/correct safely.

## Wave 8 — Chronicle & temporal depth

Now that real history exists, implement:
- Chronicle workspace/stream;
- Story Position control;
- historical Focus/as-of projections;
- Object History;
- temporal compare;
- correction/retcon impact behavior;
- deep links/return context.

**Manual checkpoint:** inspect the same Character before/after a settled Session, verify future knowledge does not leak backward, correct old history and confirm Now/audit behave distinctly.

## Wave 9 — Assisted first run, Settings, ingestion depth & hardening

Finish the core product around the proven loop:
- Librarian-assisted Saga creation/Organize material;
- richer PDF/source ingestion/reprocessing;
- Settings/usage/retention/export;
- notifications/recovery diagnostics;
- observability/evals;
- accessibility/performance pass;
- broad offline/retry/queue hardening.

Player publication remains a later program of work rather than a hidden dependency.

## Vertical-slice rule

Within each wave, prefer one complete manually testable path over completing every sibling component. If a family/component is not needed to test the slice yet, leave it catalogued and unimplemented rather than building for symmetry.
