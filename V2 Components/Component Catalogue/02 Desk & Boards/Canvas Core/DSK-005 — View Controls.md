---
id: DSK-005
status: active
kind: component
authority: current
system: SYS-02
family: canvas-core
storybook: component
depends_on:
- DSK-006
- DSK-004
- DSK-031
- DS-CAN
platforms:
- web
---

# DSK-005 — View Controls

Parent: [[DSK-002 — Canvas Viewport]]

## Purpose

Provides the small persistent viewport-control cluster for users who prefer explicit controls or need quick framing commands.

## Context & placement

Floats quietly at lower-right in screen space, above the bottom tools when the centre is constrained.

It never reserves canvas space and should remain clear of the Global Action Receipt or docked carriages through shell-aware positioning. The minimap sits above navigation controls.

## Anatomy

- zoom out;
- current zoom percentage / reset-to-100%;
- zoom in;
- Fit Board;
- Fit Selection when a selection exists;
- entry to [[DSK-006 — Canvas View Options]].

Fit Selection may appear contextually rather than occupying permanent width.

## Appearance & behaviour

Compact icon/text controls with small visual footprint and generous targets.

The percentage is useful orientation, not a precision drafting input.

Fit commands animate briefly enough to preserve spatial understanding and respect reduced-motion settings.

## States & variants

- normal;
- selection available;
- minimum/maximum zoom;
- View Options open.

## Relationships

- [[DSK-004 — Canvas Camera Navigation]] — executes camera changes.
- [[DSK-006 — Canvas View Options]] — secondary view preferences.
- [[DSK-031 — Contextual Minimap]] — complements rather than duplicates overview navigation.

## Handoff

Build **DSK-005 — View Controls** as the quiet lower-right zoom, fit, and view-options cluster for the Canvas.
