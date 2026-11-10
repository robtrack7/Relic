---
id: STG-013
status: active
kind: component
authority: current
system: SYS-11
family: encounter-mechanics
storybook: component
depends_on:
- MEC-023
- MEC-022
- MEC-003
platforms:
- web
---

# STG-013 — Live Mechanics Presentation

Parent: [[SYS-11 — Stage]]

## Purpose

Defines where live mutable resources and runnable mechanics appear during Stage so encounter utility remains useful without becoming a combat HUD.

## Core separation

**Encounter Flow** — who currently has attention?

**Mechanics Definition** — what can this runnable thing do?

**Session Mechanics State** — which optional mutable values is the GM tracking?

Do not collapse these into the encounter row.

## Presentation hierarchy

**Level 0 — Flow**
identity + flow state only.

**Level 1 — Glance**
if enabled, at most one or two template-declared primary live resources.

**Level 2 — Expanded mechanics representation**
primary live-operation surface: abbreviated stat block, actions/attacks/references, selected live resources.

**Level 3 — Focus**
full mechanics plus narrative/world context.

All levels project the same mechanics definition and Session Mechanics State.

## Current-participant behaviour

Advancing flow does not automatically open Focus.

Default:
- current participant is highlighted in Encounter Flow;
- Entity Rail marks them;
- Canvas selects/soft-follows when enabled;
- live mechanics are one quick interaction away.

If Expanded mechanics is already open, it naturally becomes the working surface.

If Focus is open, preserve it and update current flow state independently.

## Optional resource tracking

Tracking levels:

**Flow Only** — no resource controls required.

**Essentials** — template's small default set.

**Custom** — GM-selected resources.

Preferences can be remembered at Saga/template level and overridden for an Encounter.

## Resource controls

Derived from [[MEC-023 — Live Resource Definition]].

Possible controls:
- bounded number;
- counter;
- pips;
- slots;
- token pool;
- recharge toggle;
- custom adapter.

Manual editing is allowed; outcomes are not automatically applied.

## Resource scope

Resources can be scoped to:
- participant;
- party;
- encounter;
- Session/GM;
- Scene where needed.

Do not repeat Session/GM resources beside every participant.

## Runtime/canon boundary

Live values come from [[MEC-022 — Session Mechanics State]].

They are runtime state, not automatic canon.

Resource policy decides whether a value is ephemeral, carried forward, or surfaced for settlement.

## Hazards and non-Characters

The same architecture supports a hazard/environment.

Example:

**Collapsing Bridge**
- difficulty/trigger/effect from Mechanics Definition;
- `Integrity 3/5` from Session Mechanics State.

No Character identity is required.

## Relationships

- [[MEC-003 — Mechanics Layout Renderer]]
- [[MEC-006 — Resource Track]]
- [[MEC-022 — Session Mechanics State]]
- [[MEC-023 — Live Resource Definition]]
- [[STG-009 — Encounter Flow]]
- [[OBJ-CHAR-05 — Expanded Character Mechanics Back]]

## Handoff

Build **STG-013 — Live Mechanics Presentation** so flow remains minimal, Expanded mechanics is the primary live surface, Focus is optional depth, and resource tracking can disappear entirely.
