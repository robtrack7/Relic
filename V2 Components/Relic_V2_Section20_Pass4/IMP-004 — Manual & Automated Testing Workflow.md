---
id: IMP-004
status: active
kind: reference
authority: current
system: SYS-20
storybook: none
depends_on:
- IMP-003
- PLT-016
---

# IMP-004 — Manual & Automated Testing Workflow

## Testing priority

> **See and use the thing early. Automate the behavior once the intended behavior is understood.**

Do not defer manual testing until a full feature is integrated. Do not build a giant automated suite around an interaction that has not yet survived hands-on use.

## Layer 1 — Storybook manual acceptance

For every independently rendered component/pattern:
- render realistic states;
- inspect hierarchy, spacing, truncation and density;
- use mouse/trackpad and keyboard;
- verify focus/hover/selected/disabled/error/pending states as applicable;
- inspect wide and constrained web layouts where relevant;
- test combined Relic states (for example selected + proposed) where they can coexist.

A component can change freely during this stage. Do not freeze visual snapshots too early.

## Layer 2 — Component automation

After manual behavior is accepted:
- render/smoke test;
- accessibility checks;
- Storybook interaction/play tests for meaningful behavior;
- focused unit tests only for logic that benefits from isolation.

Do not write trivial tests that simply mirror implementation details.

## Layer 3 — Domain/platform tests

Before broad feature reliance, automate invariants:
- validation/schema tests;
- temporal resolver/property tests;
- Change Set transaction/optimistic revision tests;
- RLS/storage isolation tests;
- semantic tool authority/fail-closed tests;
- retrieval/citation fixtures;
- queue/idempotency/retry tests;
- local persistence/replay tests.

These are correctness contracts, not visual polish.

## Layer 4 — Integrated web E2E

Use Playwright or equivalent for a small number of product-critical paths, especially:
- new Saga → Desk → create/edit/reload;
- Relationship + Search/Library navigation;
- Sessions → Prepare → Stage;
- Stage offline/interruption recovery + End Session;
- Librarian explicit edit vs AI proposal;
- End Session → Settlement → changed world;
- Chronicle historical/as-of correctness;
- export when AI is unavailable/quota-limited.

## Visual regression

Add visual regression only after a component/reference scene has a deliberately accepted baseline. Use it to catch drift, not to fossilize unfinished design exploration.

## Manual acceptance ownership

The GM/user remains the final judge of whether a `current` interaction actually feels right. When manual testing disproves the catalogue, update the smallest relevant current contract rather than layering workarounds.
