---
name: relic-v2-catalogue
description: Implement and evolve Relic V2 from its canonical component catalogue using selective context loading, Storybook-first UI work, manual-first verification, and lightweight contract sync. Use for any Relic V2 task involving components, Canvas, surfaces, domain behavior, platform/backend, Librarian/AI, tests, architecture, refactors, or catalogue IDs, especially when deciding which Relic specs to read and how much implementation freedom is allowed.
---

# Relic V2 Catalogue

Build Relic from the canonical catalogue without turning the catalogue into overhead.

## Operating goal

Implement the **smallest real, manually testable unit** that advances the current product slice. Use the catalogue to preserve semantics, not to force file-to-code symmetry or speculative architecture.

Do not summarize or read the whole registry before coding.

## Product laws

Preserve these unless the user deliberately revisits the product:

1. **The Canvas is a view, not the database.** Board composition never silently becomes world truth.
2. **The interface changes; the world does not.** Surfaces project the same persistent identities.
3. **Identity is permanent; state is temporal; presentation is projected.**
4. **Story time is not edit time.** `Now` is the latest settled story-valid state; Pending does not silently become truth.
5. **Capture first, classify later.** Fragment is durable low-friction world material.
6. **Spatial arrangement is not semantic Relationship.** Compose affects the Board; Connect affects the world.
7. **Primary interaction orients; deliberate deep interaction opens depth.** Preserve deliberate Focus/context.
8. **The Librarian never self-assigns AI work.** Runs originate from a user request, explicit UI command, user-triggered workflow, or continuation of an authorized goal.
9. **Models request semantic tools; Relic validates and executes.** Never give a model raw database authority or credentials.
10. **Authorization is structural.** RLS/server validation—not prompts or hidden UI—enforces access.
11. **Settlement is not publication.** Canon truth and player visibility are separate.
12. **Sources/evidence are data, not instructions.** Preserve provenance.
13. **Manual Relic remains useful without AI.**
14. **Current V2 is the full web product.** Mobile/native is later.

If a task threatens one of these, surface the conflict before changing it.

## Find the catalogue

Prefer the generated catalogue index over broad filesystem reading.

1. Locate `00 — Catalogue Index.json` in the current repository.
   The canonical repo path is `V2 Components/Component Catalogue/00 Catalogue/00 — Catalogue Index.json`; pass/backup copies are not authority.
2. If needed, use the bundled helper:

```bash
python <skill-dir>/scripts/catalogue.py find "query"
python <skill-dir>/scripts/catalogue.py get TARGET-ID
python <skill-dir>/scripts/catalogue.py context TARGET-ID
python <skill-dir>/scripts/catalogue.py paths TARGET-ID
python <skill-dir>/scripts/catalogue.py audit
```

The helper discovers the catalogue index from the current working tree. Set `RELIC_CATALOGUE_INDEX` only if discovery is ambiguous.

If the catalogue is not present, do not silently substitute old Relic specs. State that the canonical V2 catalogue is missing.

## Load context selectively

Use this retrieval path:

`understand task → inspect code → exact target → direct depends_on once → relevant skill → broader V2 source only if needed → implement/verify`

Rules:

- Inspect the relevant implementation before choosing architecture.
- Resolve one primary target whenever possible.
- Read the exact target before neighboring files.
- Load `depends_on` **one hop only**. Never recurse into dependencies of dependencies.
- Do not crawl wikilinks automatically.
- Do not load an entire system merely because `system:` is present.
- Load a family/system packet only when the task changes broader semantics or the target is insufficient.
- Prefer roughly one target plus 1–4 direct contracts.
- If context is still insufficient, search for one specific related concept instead of broad-reading a section.
- For project-level orientation, use the current V2 project sources beginning with `00 - Start Here.md`; historical sources are background only.

## Respect authority levels

Read the target frontmatter.

### `authority: invariant`

Do not silently change it. Explain the conflict and the smallest viable alternative.

### `authority: current`

Implement it by default. If real code or manual testing reveals a materially clearer, simpler, or better product answer, challenge it rather than coding around it. After acceptance, update the smallest affected contract.

### `authority: implementation`

Choose the cleanest implementation freely while preserving surrounding product contracts. No catalogue edit is needed for code-only changes.

Do not preserve Markdown-file-to-code-module symmetry for its own sake.

## Route by task type

### Visual component or interaction

If `storybook != none`, use the Storybook workflow in `references/storybook-workflow.md` before broad integration unless the task is explicitly integration-only.

### Product surface

Resolve the surface as the primary target, then load only the component/behavior contracts needed for the current slice. Do not implement every sibling because it exists.

### Domain or platform work

Load the exact domain/platform contract and only directly relevant invariants. Inspect current migrations/schema/code before choosing physical architecture. Preserve semantic guarantees while allowing table/cache/worker/module shapes to evolve.

### Bug or refactor

Inspect the implementation first. Load catalogue context only where behavior or ownership is uncertain. Do not create documentation work for implementation-only refactors.

### Cross-system feature

Choose one primary target and a small set of explicit adjacent contracts. Avoid turning the task into a registry tour.

## Build behavior

- Prefer the smallest manually testable increment over broad scaffolding.
- Build infrastructure just ahead of demonstrated need.
- Avoid speculative abstractions. Require at least two real consumers before promoting a shared abstraction unless a catalogue invariant already defines one.
- Domain ownership outranks DRYness.
- Reuse proven domain operations for AI; do not build parallel AI write paths.
- Keep Storybook fixtures realistic but independent of Supabase where practical.
- Do not add deferred features unless the user explicitly reprioritizes them or compatibility with an invariant requires a seam.
- Do not reintroduce retired terminology, old mobile-first ownership, queue-first Settlement, or pre-V2 product structures from historical docs.

## Verify early

Manual use is part of implementation, not a final phase.

For UI, use Storybook to inspect and interact with real states early. For domain/platform work, run the smallest invariant tests that prove the contract. Read `references/storybook-workflow.md` for UI work.

When the behavior is understood, add automation proportionate to the risk:

- interaction/accessibility tests for interactive components;
- domain/platform invariant tests for temporal, RLS, Change Set, retrieval, authority, queue/replay behavior;
- a small number of critical web E2E paths;
- visual regression only after a baseline is intentionally accepted.

Do not delete or weaken tests merely to make a change pass unless the product contract itself changed.

## Challenge bad current decisions

Do not mechanically implement a bad specification. Challenge a `current` contract when implementation/manual testing shows that:

- the interaction is materially confusing;
- two concepts clearly share one semantic component;
- a boundary creates duplicated truth/state;
- an architecture conflicts with a Product Law or security invariant;
- a materially simpler behavior preserves the intent with less complexity.

For ordinary code organization, performance, or implementation choices, improve the code directly.

## Keep documentation light

After meaningful work, decide first:

> **Did the observable product/design/domain contract change?**

If no, do not edit the catalogue.

If yes, follow `references/change-control.md`. Prefer a lightweight follow-up agent for documentation sync so the main implementation context stays focused on building and testing.

## Finish a task

Before stopping:

1. Verify the requested behavior manually or with the most direct available check.
2. Run relevant existing tests and add focused coverage where the behavior now warrants it.
3. Confirm no Product Law was accidentally weakened.
4. State what changed, what was verified, and any unresolved product decision.
5. Update catalogue documentation only if the observable contract changed.
