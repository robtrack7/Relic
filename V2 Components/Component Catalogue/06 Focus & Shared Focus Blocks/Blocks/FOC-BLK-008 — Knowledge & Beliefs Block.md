---
id: FOC-BLK-008
status: active
kind: component
authority: current
system: SYS-06
family: blocks
storybook: component
depends_on:
- OBJ-CHAR-17
- FOC-011
- FOC-BLK-014
- DS-FOC
platforms:
- web
---

# FOC-BLK-008 — Knowledge & Beliefs Block

Parent: [[SYS-06 — Focus & Shared Focus Blocks]]

## Purpose

Provides the deep view of narratively meaningful knowledge held by a Character or other actor-like World Object.

## Knowledge model

Supports meaningful entries such as:
- Knows;
- Believes;
- Suspects;
- Was told.

Each entry can optionally carry:
- proposition/statement;
- related World Object(s);
- Event/story position acquired;
- Source/provenance;
- truth/accuracy relationship where Relic has that information.

## Use

The block is intentionally sparse.

Relic does not attempt to model every fact a Character could infer or know.

Only knowledge that matters to story continuity or play should normally be recorded.

## Appearance & behaviour

Group by knowledge state only when grouping improves reading.

Meaningful individual entries can be expanded for source/history detail.

Inline editing supports adding new knowledge without leaving Focus.

## Temporal behaviour

Historical/as-of Focus shows only knowledge valid at that story position.

Later-learned information must not leak backward.

## Relationships

- [[OBJ-CHAR-17 — Character Knowledge Snapshot]] — compact contextual projection.
- [[FOC-011 — Focus Temporal Context]] — as-of knowledge.
- [[FOC-BLK-014 — Sources & Provenance Block]] — evidence/origin.

## Handoff

Build **FOC-BLK-008 — Knowledge & Beliefs Block** as the sparse, temporally aware deep knowledge model for actor-like Focus surfaces.
