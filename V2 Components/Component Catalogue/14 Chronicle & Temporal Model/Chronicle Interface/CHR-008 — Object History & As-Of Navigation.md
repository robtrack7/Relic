---
id: CHR-008
status: active
kind: behavior
authority: current
system: SYS-14
family: chronicle-interface
storybook: pattern
depends_on:
- FOC-011
- FOC-BLK-011
- CHR-003
platforms:
- web
---

# CHR-008 — Object History & As-Of Navigation

Parent: [[SYS-14 — Chronicle & Temporal Model]]

## Purpose

Connects ordinary World Object representations to their meaningful story history and as-of projections.

## Object history

History emphasizes:
- Events;
- major state changes;
- Relationship starts/ends;
- Knowledge changes;
- Thread changes;
- meaningful Session settlements.

It does not list every database edit.

## As-of navigation

Selecting a historical entry can open the same family Focus/representation at that Story Position using [[FOC-011 — Focus Temporal Context]].

## Example

Mara history:
- Session 4 — joined Lantern Society;
- Session 9 — left Lantern Society;
- Session 12 — learned of Iron Deed;
- Session 14 — swore to Crown.

## Family reuse

History presentation can be assembled with shared temporal infrastructure but family-specific labels/consequences remain domain-owned.

## Implementation latitude

Object-history query helpers may live with Temporal Resolver, family repositories, or a dedicated history read model. The product contract is story-significant history + correct as-of navigation.

## Relationships

- [[FOC-011 — Focus Temporal Context]]
- [[FOC-BLK-011 — Event History Block]]
- [[CHR-003 — Temporal Resolver & Now Projection]]
- [[CHR-012 — Temporal Deep Links & Return Context]]

## Handoff

Implement **CHR-008** as a shared navigation/query contract; do not create duplicate historical copies of World Objects.
