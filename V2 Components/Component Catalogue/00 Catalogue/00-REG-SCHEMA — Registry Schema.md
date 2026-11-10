---
id: 00-REG-SCHEMA
status: active
kind: reference
authority: current
storybook: none
---

# Registry Schema

This schema is designed for **selective Codex/Claude retrieval**, Storybook-first UI development, and flexible implementation. It is not a project-management ledger.

```yaml
---
id: OBJ-CHAR-02
status: active
kind: component
authority: current
system: SYS-04
family: character-projections
storybook: component
depends_on:
  - OBJ-002
  - OBJ-004
  - BRD-006
platforms:
  - web
---
```

## Required / strongly preferred fields

### `id`
Stable identifier for the current canonical concept. ID stability before initial Codex adoption is not a constraint; Pass 3 may freely renumber/reorganize. Never silently recycle a retired ID after the new catalogue ships.

### `status`
Use only product maturity/scope:
- `active`
- `prototype`
- `deferred`

Do **not** use registry status for sprint state, PR status, blockers, percent complete, or test completion.

### `kind`
Final vocabulary:
- `system`
- `family`
- `surface`
- `primitive`
- `component`
- `behavior`
- `domain`
- `platform`
- `reference`

Retire ambiguous `backend`: semantic/domain models become `domain`; Section 19 implementation architecture becomes `platform`.

### `authority`
- `invariant` — changing this materially changes Relic's product/security/trust contract; escalate.
- `current` — best current product/design answer; implement it, but challenge it when manual testing or implementation reveals a materially better answer.
- `implementation` — current implementation suggestion only; Codex may change it freely while preserving surrounding contracts.

### `system` / `family`
Provide cheap ownership routing. System files should become compact maps, not duplicate summaries. Family indexes are retrieval packets.

### `storybook`
- `none`
- `primitive`
- `component`
- `pattern`
- `scene`

This describes the intended Storybook/manual-test target, not whether the story has already been implemented.

### `depends_on`
Only direct context/contracts needed to understand or build the concept. Aim for 1–4; five is a useful warning threshold. System/family ownership is already available through metadata and normally does not need to be repeated here. Parent/composition relationships can remain in the body.

`depends_on` is **not** the build-order graph and does not need to be acyclic. Mutual context dependencies are acceptable when genuinely useful. The skill loads this list **once** and must never recursively crawl dependency chains. Broader conceptual relationships stay in the Markdown body/wikilinks.

### `platforms`
Optional. Add only where platform ownership materially affects behavior/implementation (`web`, `native`, or both). Do not add noisy metadata to every file if semantic parity is sufficient.

## Explicitly excluded metadata
Do not put these in durable component specs:
- sprint / milestone
- assignee
- PR number
- code path
- percent complete
- test complete
- blocker
- implementation timestamp

Those belong in a lightweight implementation work ledger, not the product catalogue.

## Suggested file sizes
- primitive: ~50–250 words
- component: ~100–500 words
- behavior: ~100–600 words
- family/system index: ~100–350 words
- complex domain/platform contract: as much as required, but avoid repeating linked contracts

## Retrieval principle
**Embedded map = topology. Searchable generated index = inventory.**

The future skill should load the compact global laws/map, then the exact requested component, then direct `depends_on` context only.


## Current platform scope

The current implementation/design target is web. `platforms: [web]` is used where platform metadata is useful; mobile/native adaptation is intentionally deferred rather than represented as current parity.
