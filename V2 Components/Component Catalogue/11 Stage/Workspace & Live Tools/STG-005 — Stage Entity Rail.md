---
id: STG-005
status: active
kind: component
authority: current
system: SYS-11
family: workspace-live-tools
storybook: component
depends_on:
- OBJ-015
- OBJ-CHAR-11
- STG-003
- DS-WFL
platforms:
- web
---

# STG-005 — Stage Entity Rail

Parent: [[STG-002 — Stage Carriage]]

## Purpose

Provides an extremely fast, spatially intuitive bridge from live Session context into the actual World Objects and Session Instances on the central Canvas.

## Context & placement

Runs vertically along the right edge of Stage Carriage, immediately adjacent to the Canvas.

## Contents and ordering

Prioritize:
1. current Scene material;
2. current Encounter Participant;
3. GM-pinned live references;
4. other prepared/session-relevant objects;
5. recently accessed live objects.

Persistent Characters can use portrait bubbles. Other World Object families and Session Instances use recognizable family/kind treatments.

## Core interaction law

Relic-wide principle:

> **Primary interaction orients; deliberate deep interaction opens depth.**

**Desktop**
- hover/focus → name + concise Session Relevance;
- single click → locate/select on Canvas;
- second ordinary activation when already located can deepen contextually;
- double-click → open Focus/deep detail directly.

**Touch**
- tap → locate/select;
- explicit deep-open action → open Focus/deep detail.

**Keyboard**
- primary activation → locate/select;
- explicit deep-open command → Focus/deep detail.

Do not require Card → Expanded → Focus when the GM already intends Focus.

## Persistent object behaviour

Primary activation selects an existing Card/Expanded Card or reveals a temporary Stage projection, updates Librarian context, and preserves ordinary disclosure.

There is no duplicate Stage Card.

## Session Instance behaviour

Session Instances use the same rail grammar.

Primary activation locates their lightweight live representation.

Deep activation opens their full runnable mechanics/detail treatment.

If later resolved into a persistent World Object, preserve interaction continuity.

## Stability

Dynamic Scene ordering must not make the rail constantly jump.

Prefer a stable pinned region and a contextually changing current region. Animate reordering subtly and preserve pointer/touch target continuity.

## Relationships

- [[OBJ-015 — Object Reference Navigation]]
- [[OBJ-CHAR-11 — Character Stage Bubble]]
- [[STG-003 — Stage Canvas View]]
- [[STG-010 — Session Instance Model]]
- [[STG-009 — Encounter Flow]]

## Handoff

Build **STG-005 — Stage Entity Rail** as a fast locate-or-deepen interaction surface with stable, context-aware live ordering.


## Object navigation contract

Character and other Entity Rail items use the shared primary-orients / deliberate-deep-opens law. Selecting a rail item foregrounds or locates its ordinary projection; deep activation opens Focus. Character-specific navigation is not a separate behavior.

Rendered rail-item anatomy is catalogued in [[STG-005A — Stage Entity Rail Item]].
