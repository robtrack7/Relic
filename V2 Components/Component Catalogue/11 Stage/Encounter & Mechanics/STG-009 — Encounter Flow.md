---
id: STG-009
status: active
kind: component
authority: current
system: SYS-11
family: encounter-mechanics
storybook: component
depends_on:
- MEC-014
- STG-012
- STG-013
- DS-WFL
platforms:
- web
---

# STG-009 — Encounter Flow

Parent: [[STG-002 — Stage Carriage]]

## Purpose

Provides optional structured live-play flow without assuming every TTRPG uses D&D-style initiative or that every GM wants mechanical tracking.

## Core abstraction

Encounter Flow answers: **Who is involved, and where should live attention move next?** It can support combat, chase, ritual, negotiation, hazard sequence, infiltration or other structured live play.

## Flow adapters

[[MEC-014 — Encounter Flow Definition]] selects the model.

**Ranked**
rolled/manual initiative, sorted order, current participant, rounds and configured reorder rules.

**Spotlight**
current spotlight and optional recent-opportunity/history tracking; no fake numeric initiative.

**Alternating**
side/participant alternation.

**Phased**
system-defined phases.

**Freeform / None**
participant roster with no turn-order machinery.

## Tracking levels

**Flow Only**
- participants;
- current turn/spotlight;
- round/phase only when the flow model uses one.

**Essentials**
- additionally surfaces a tiny set of template-declared primary live resources.

**Custom**
- GM chooses which available live resources are surfaced.

Flow Only is first-class.

## Participant management

Support:
- add/remove participant;
- find persistent World Object;
- add existing Session Instance;
- instantiate a rules/template result as Session Instance;
- create a quick Session Instance;
- bulk-add Scene participants;
- duplicate template-backed adversaries such as `Goblin ×4`.

## Current participant

Changing current participant updates Stage Entity Rail, Stage Canvas active treatment and Librarian context, and can soft-follow when enabled.

It must not automatically open/close Focus or force resource tracking.

## No combat engine

Encounter Flow does not own attacks, targeting, damage application, HP deduction, condition duration, movement grids, saves, resource spending, enemy AI or rule adjudication.

## Relationships

- [[MEC-014 — Encounter Flow Definition]]
- [[STG-012 — Encounter Participant]]
- [[STG-010 — Session Instance Model]]
- [[STG-013 — Live Mechanics Presentation]]
- [[STG-003 — Stage Canvas View]]

## Handoff

Build **STG-009 — Encounter Flow** as a template-driven optional attention/turn/spotlight system whose minimal mode tracks flow only.
