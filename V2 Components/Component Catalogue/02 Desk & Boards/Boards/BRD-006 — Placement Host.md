---
id: BRD-006
status: active
kind: component
authority: current
system: SYS-02
family: boards
storybook: component
depends_on:
- DSK-020
- DSK-021
- DSK-019
- DS-CAN
platforms:
- web
---

# BRD-006 — Placement Host

Parent: [[DSK-002 — Canvas Viewport]]

## Purpose

The Placement Host is the generic spatial wrapper that allows a persistent World Object projection or Board-only object to exist at a specific location and size on a Board.

It is a foundational separation between **what something is** and **where/how it is arranged here**.

## Context & placement

Every spatial World Object occurrence on a Board is mounted through a Placement Host.

World Object example:
`Character identity → Character Card projection → Placement Host → Board`

Board-only composition components can also use equivalent Placement geometry.

## Anatomy

Owns:
- x/y position;
- width/height;
- z-order;
- local lock state;
- Board-local presentation/disclosure selection;
- object/projection reference;
- selection/manipulation integration.

It does not render generic card chrome around every child.

## Appearance & behaviour

Normally invisible.

Selection chrome is provided by the Canvas selection system.

The host must allow separately coded object projections to swap during semantic zoom or deliberate disclosure without losing placement identity.

## States & variants

- normal;
- selected;
- locked;
- hidden/suppressed only if future Board view requires it;
- projection transition.

## Relationships

- [[DSK-020 — Placement Drag]] — updates geometry.
- [[DSK-021 — Placement Resize & Disclosure]] — dimensions/projection.
- [[DSK-019 — Selection Frame & Handles]] — interaction chrome.
- World Object representation families — rendered content.

## Data / utility relationship

Reads/writes Board Placement state referencing stable object identity. Placement data must never become a second copy of World Object content.

## Handoff

Build **BRD-006 — Placement Host** as the invisible reusable spatial wrapper separating Board geometry/presentation from persistent World Object identity.
