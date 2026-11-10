---
id: PREP-010
status: active
kind: behavior
authority: current
system: SYS-10
family: prepare
storybook: none
depends_on:
- SES-001
- PREP-002
- PREP-003
---

# PREP-010 — Stage Readiness & Session Packet

Parent: [[PREP-001 — Prepare Workspace State]]

## Purpose

Defines the Prepare → Stage handoff without copying canon or freezing the Session. The Session Packet is a read-model/composition of the material Stage needs.

## Packet contents

May include:
- Session identity;
- objective;
- opening;
- ordered Scenes/Beats;
- checklist/reminders intended for live use;
- active Threads;
- prepared World Object IDs;
- prepared Session Instances;
- planned Scene participant rosters;
- Session-local relevance cues;
- pinned Sources/references;
- recording/session preferences where later defined.

World Object data is resolved from persistent identities.

## Ready action

`Ready for Stage` should:
1. save current Prep;
2. set Session to Ready;
3. record readiness timestamp;
4. surface warnings if prep is sparse;
5. enable/offer `Enter Stage`.

Ready is not a lock.

## Sparse prep

Hard requirement: valid Session identity/title. Everything else should be a **soft warning** rather than a blocker. Possible warnings: no objective, no opening, no Scenes/Beats, no prepared World Objects, no active Threads. The GM can always `Enter Stage Anyway`. Relic must support improvisational play.

## Transition to Stage

Entering Stage preserves the current Session, transforms left Prep Carriage into Stage Carriage, keeps the central Canvas, shifts Prep Lens into Stage View, preserves relevant prepared references, keeps Librarian available, and changes Session state to In Progress. This should feel like the same workspace becoming live.

## Editing after Ready

The GM can continue editing Prep after marking Ready. If already In Progress, live Session behavior is owned by Stage, but Session-local composition can still evolve through Stage tools where allowed.

## No canon fork

The packet never stores copied Character/Place/etc. canon as authoritative Session versions. Stage resolves current authorized persistent identities and combines them with Session-local relevance/order.

## Relationships

- [[SES-001 — Session Model & Lifecycle]]
- [[PREP-002 — Prepare Carriage]]
- [[PREP-003 — Prep Canvas Lens]]
- [[PREP-005 — Scene & Beat Stack]]
- [[PREP-006 — Session Context Collection]]
- Stage system

## Handoff

Implement **PREP-010 — Stage Readiness & Session Packet** as the non-blocking read-model handoff that transforms Prepare workspace state directly into Stage.
