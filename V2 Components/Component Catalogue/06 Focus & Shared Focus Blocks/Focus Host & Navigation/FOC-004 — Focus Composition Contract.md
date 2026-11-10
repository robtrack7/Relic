---
id: FOC-004
status: active
kind: behavior
authority: current
system: SYS-06
family: focus-host-navigation
storybook: none
depends_on:
- FOC-005
- DS-FOC
---

# FOC-004 — Focus Composition Contract

Parent: [[FOC-001 — Focus Host]]

## Purpose

Defines how each World Object family declares deliberate Focus pages using shared blocks without creating one generic universal Focus page. Focus pages are curated reading/editing projections; the Entity Builder owns flexible block authoring.

## Composition model

A family Focus declares:
- page order and labels;
- blocks present on each page;
- relative emphasis and layout region preference;
- optional family-specific pages/blocks;
- which pages/blocks are temporally aware;
- which pages disappear when empty;
- which pages expose contextual add/edit affordances.

Example family page declarations:

- **Character / PC:** Overview, Mechanics, Relationships, History, Notes, Sources.
- **Place / Faction:** Overview, People & Connections, History, Notes, Sources.
- **Thread:** Overview, Developments, Relationships, Notes, Sources.
- **Artifact:** Overview, Properties, Relationships, History, Sources.
- **Event:** Overview, Participants & Consequences, Relationships, Sources.
- **Source:** Overview, Content, Linked Material, Provenance.
- **Fragment / Note:** Content, Connections, Sources.

Family declarations omit irrelevant or empty pages. A complex object may expose more pages than a sparse object, but Focus never renders empty inventory merely because a block exists in the Builder document.

A Place or Event Focus declares a different composition.

## Boundaries

The family Focus owns composition.

The shared Focus Block owns its internal anatomy/behavior.

The GM does not initially drag/reorder the entire Focus page. Builder block order is independent authoring state; Focus page composition remains family-owned.

The contract should not render every registered block merely because the system supports it.

## Relationships

- [[FOC-005 — Focus Layout System]] — turns composition declarations into responsive layout.
- reusable FOC-BLK components — supply shared semantic blocks.
- World Object family Focus surfaces — declare the actual compositions.

## Handoff

Implement **FOC-004 — Focus Composition Contract** as the family-declared page/block presence, order, and emphasis model for Focus surfaces, with explicit projection into the shared Entity Builder document.
