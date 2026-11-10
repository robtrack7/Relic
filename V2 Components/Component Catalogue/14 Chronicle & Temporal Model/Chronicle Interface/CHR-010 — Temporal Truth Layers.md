---
id: CHR-010
status: active
kind: behavior
authority: current
system: SYS-14
family: chronicle-interface
storybook: none
depends_on:
- REV-009
- REV-014
- LBR-006
---

# CHR-010 — Temporal Truth Layers

Parent: [[SYS-14 — Chronicle & Temporal Model]]

## Purpose

Defines which temporal interpretations count as story truth and how product surfaces may intentionally overlay unsettled material.

## Layers

**Settled**
Story-valid truth, whether GM-settled or policy-eligible auto-settled. Provenance remains distinguishable.

**Pending**
Possible interpretation/proposal awaiting settlement. Not ordinary canon.

**Corrected / Reverted**
Retained for audit but not story-valid state.

**Evidence**
Transcript, Source, Fragment, notes, etc. Claims/evidence do not become truth merely by existing.

## Projection policies

Default product surfaces: **Settled only**.

Settlement: **Settled + Pending**.

Prepare with unsettled prior Session: **Settled + clearly marked Pending overlay**.

Librarian: task-dependent, but always explicitly distinguishes layers.

## Auto-settlement

Auto-settled and GM-settled are both Settled story truth when policy allows, but audit/provenance records how settlement occurred.

## Implementation latitude

Layer representation may be flags/statuses, separate proposal/change records, derived read modes, or other architecture. Product callers should request a truth-layer mode rather than manually filtering implementation tables.

## Relationships

- [[REV-009 — Settlement Policy & Review Style]]
- [[REV-014 — Revert, Correct & Audit]]
- [[LBR-006 — Context Assembly & Grounding Layers]]
- [[CHR-003 — Temporal Resolver & Now Projection]]

## Handoff

Implement **CHR-010** as an explicit projection/read policy shared across product surfaces; do not scatter ad-hoc `pending=false` rules through UI code.
