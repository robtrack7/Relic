---
id: STG-003
status: active
kind: behavior
authority: current
system: SYS-11
family: workspace-live-tools
storybook: none
depends_on:
- PREP-003
- STG-005
- STG-009
---

# STG-003 — Stage Canvas View

Parent: [[STG-001 — Stage Workspace State]]

## Purpose

Applies live Session attention to the ordinary Canvas without replacing its tools, World Object cards, Boards, or identity model.

## Core rule

Stage Canvas is the normal Canvas.

It retains:
- Select;
- Create;
- Compose;
- Connect;
- normal Card/Expanded Card behaviour;
- Focus;
- Board navigation;
- semantic relationships;
- placement editing.

Stage changes emphasis, not identity.

## Foregrounding

Stage can foreground:
1. current Scene material;
2. current Encounter Participant;
3. prepared/session-relevant objects;
4. recently accessed live objects.

Unrelated Board material can soften modestly but should not disappear by default.

## Temporary Stage projections

If relevant material is not placed on the current Board, Stage may reveal a temporary Stage projection.

For persistent World Objects:
- use the ordinary family Card/Expanded Card;
- reference the same persistent identity;
- do not mutate the Board.

For Session Instances:
- use [[STG-010 — Session Instance Model]]'s lightweight live representation.

`Keep on Board` can explicitly create a persistent Board Placement where valid.

## Encounter follow

Encounter Flow can offer `Follow Encounter`.

When enabled:
- changing the current participant gently locates/selects its live Canvas representation;
- if already visible, avoid unnecessary viewport movement;
- if the GM is in Focus or deliberate inspection, do not force-close or replace it.

When disabled:
- flow changes without moving the Canvas.

A current-participant affordance can always return the GM to the active participant.

## Relationships

- [[PREP-003 — Prep Canvas Lens]]
- [[STG-005 — Stage Entity Rail]]
- [[STG-009 — Encounter Flow]]
- [[STG-013 — Live Mechanics Presentation]]
- [[BRD-006 — Placement Host]]

## Handoff

Implement **STG-003 — Stage Canvas View** as a live attention layer over the full ordinary Canvas, including optional soft-follow behaviour.
