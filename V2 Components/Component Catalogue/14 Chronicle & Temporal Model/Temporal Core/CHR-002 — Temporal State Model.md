---
id: CHR-002
status: active
kind: domain
authority: current
system: SYS-14
family: temporal-core
storybook: none
depends_on:
- REL-007
- CHR-001
- CHR-003
---

# CHR-002 — Temporal State Model

Parent: [[SYS-14 — Chronicle & Temporal Model]]

## Purpose

Defines how meaningful World Object and Relationship state changes across story time while persistent identity remains stable.

## Temporal semantics

Families declare which semantics can vary through story time. Do not version every field merely because the database can.

Typical temporal semantics include:
- status/state;
- location;
- allegiance/control;
- goals/motives;
- knowledge/beliefs;
- holdings;
- Thread state;
- Relationship validity;
- selected persistent mechanics consequences.

## Family ownership

Shared temporal infrastructure owns validity/order/truth mechanics. Domain families own what a change means and how it projects.

Examples:
- Character decides which Character fields are temporal;
- Relationship uses [[REL-007 — Relationship Temporal History]];
- Thread owns its narrative state vocabulary.

## Event versus state mutation

**Event** = meaningful story occurrence.

**Temporal mutation** = state consequence effective at a Story Position.

**Audit action** = software/user/AI write history.

One Event may produce many temporal mutations. A typo fix may produce audit history but no story Event/mutation.

## Intervals and recurrence

The model must represent facts that begin/end, recur, or are corrected. Exact persistence strategy may differ by domain; semantics must support valid-at-position resolution.

## Implementation latitude

Do not force a universal EAV/event-sourcing schema solely for conceptual purity. It is acceptable to combine materialized current state with temporal records, family-specific histories, or derived projections if one resolver contract preserves correct as-of semantics.

Prefer the simplest architecture that can reconstruct story-valid history reliably.

## Relationships

- [[CHR-001 — Story Time & Position Model]]
- [[CHR-003 — Temporal Resolver & Now Projection]]
- [[REL-007 — Relationship Temporal History]]
- [[OBJ-009 — Historical & As-Of Indicator]]

## Handoff

Implement **CHR-002** as shared temporal semantics plus family-owned temporal declarations; avoid a second temporal engine inside each object family.
