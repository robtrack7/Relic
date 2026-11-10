---
id: OBJ-CHAR-11
status: active
kind: component
authority: current
system: SYS-04
family: projections
storybook: component
depends_on:
- STG-002
- STG-005
- DS-OBJ
platforms:
- web
---

# OBJ-CHAR-11 — Character Stage Bubble

Parent: [[OBJ-CHAR — Character Representation Family]]

## Purpose

Glanceable Character shortcut inside the Stage Entity Rail. It is **not** another Character card; it navigates to the canonical Character on the central Stage Canvas.

## Context & placement

Lives along the right-hand edge of [[STG-002 — Stage Carriage]], adjacent to the Canvas. Stage owns the rail; Character supplies the bubble.

## Anatomy

Portrait/initial, optional tiny relevance/state mark, and active treatment. Hover/focus reveals name, role, and Session Relevance Cue.

## Appearance & behaviour

Small portrait-like circle/soft token at the carriage/Canvas boundary.

- hover/focus → name + Session Relevance;
- single click → locate/select through [[STG-005 — Stage Entity Rail]];
- double-click / explicit deep-open → Character Focus directly;
- current Encounter Participant may receive active-flow treatment.

Stage owns encounter state; Character owns identity/projection.

## Handoff

Build **OBJ-CHAR-11 — Character Stage Bubble** as the compact Stage-side shortcut to the normal central Canvas Character.
