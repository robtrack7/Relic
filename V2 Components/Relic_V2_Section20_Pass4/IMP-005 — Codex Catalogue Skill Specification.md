---
id: IMP-005
status: active
kind: reference
authority: implementation
system: SYS-20
storybook: none
depends_on:
- IMP-001
- IMP-003
- IMP-004
- 00-AUTHORITY-POLICY
---

# IMP-005 — Codex Catalogue Skill Specification

## Purpose

Defines the future lightweight skill that lets Codex work from this catalogue without repeatedly loading hundreds of specifications.

## Content embedded in the skill

Embed only:
- compact Product Laws;
- Authority/Change rules;
- system/family topology from Catalogue Map;
- retrieval algorithm;
- Storybook-first/manual-test rules;
- documentation-sync rule.

Do **not** embed the complete component inventory or full system specs. The generated `00 — Catalogue Index.json` is the searchable inventory.

## Task-routing algorithm

When given a task:

1. **Classify intent** — visual component, interaction behavior, product surface, domain model, platform/backend, bug/refactor, or cross-system feature.
2. **Resolve target** — search catalogue index by explicit ID first, then exact title/family/keywords. Prefer one canonical target.
3. **Read target** — do not broad-read the owning section first.
4. **Load direct context** — open `depends_on` once; never recursively expand.
5. **Add only necessary owner context** — load system/family packet only if the task changes system semantics or the target is insufficient.
6. **For UI** — use Storybook target and direct DS dependencies; implement/test there before integration unless the task is explicitly integration-only.
7. **For platform/domain** — load only linked domain/platform invariant contracts, then inspect migrations/code.
8. **Inspect current implementation** — code can reveal that an implementation suggestion is obsolete or already solved.
9. **Implement the smallest manually testable unit.**
10. **Run relevant tests/manual checkpoint.**
11. **Escalate only meaningful conflicts** — invariant conflict or material product change. Do not stop for ordinary implementation choices.
12. **Documentation sync at end** — invoke the lightweight sync workflow only if the implementation changed a product contract or catalogue metadata.

## Authority behavior

**Invariant** — do not silently change. Surface the conflict and proposed alternative.

**Current** — implement by default; if manual testing/code reality materially improves the answer, change intentionally and update the catalogue after acceptance.

**Implementation** — choose the cleanest current implementation freely; no registry update required unless the observable contract changes.

## Storybook behavior

For a target with `storybook != none`:
- create/update the story with the component;
- include authored important states;
- use realistic Relic fixtures;
- manually validate before widespread integration;
- add interaction/a11y automation proportionate to behavior.

Do not make Storybook a separate prototype codebase that must later be rewritten.

## Anti-paperwork rules

The skill must not:
- summarize the whole registry before coding;
- recursively follow wikilinks;
- generate a planning document for every component;
- update specs for code-only refactors;
- preserve file-to-code symmetry for its own sake;
- ask for confirmation when the catalogue clearly leaves an implementation choice flexible.

## When to challenge the catalogue

Challenge rather than work around it when implementation/manual testing reveals:
- an interaction is materially confusing or worse in real use;
- two current components should clearly share one semantic component;
- a current feature boundary creates duplicated state/truth;
- a proposed architecture violates a Product Law/security contract;
- a much simpler product behavior preserves intent with less complexity.

For minor code organization/performance choices, simply improve the implementation.
