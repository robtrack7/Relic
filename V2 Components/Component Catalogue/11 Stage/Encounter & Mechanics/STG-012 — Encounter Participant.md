---
id: STG-012
status: active
kind: domain
authority: current
system: SYS-11
family: encounter-mechanics
storybook: none
depends_on:
- MEC-014
- MEC-022
- STG-010
---

# STG-012 — Encounter Participant

Parent: [[STG-009 — Encounter Flow]]

## Purpose

Defines runtime membership in an Encounter Flow without inventing another identity model.

## Identity reference

An Encounter Participant points to:
- a mechanically valid persistent World Object;
- [[STG-010 — Session Instance Model]].

The participant record is runtime membership, not an entity.

## Runtime data

May contain:
- encounter membership ID;
- referenced runnable identity;
- order/slot/phase/spotlight metadata;
- manual initiative/result override where applicable;
- tie-break/order metadata;
- active/current state;
- encounter-local notes;
- runtime mechanics linkage.

The flow adapter determines which fields matter.

## Duplication

`Goblin ×4` can share one mechanics definition while preserving separate participant/runtime identity and state.

## Removal

Removing from Encounter Flow does not delete the World Object or Session Instance; it ends only runtime participation.

## Relationships

- [[STG-009 — Encounter Flow]]
- [[STG-010 — Session Instance Model]]
- [[MEC-014 — Encounter Flow Definition]]
- [[MEC-022 — Session Mechanics State]]

## Handoff

Implement **STG-012 — Encounter Participant** as the small runtime membership layer between runnable identity and Encounter Flow.
