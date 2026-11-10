---
id: DSK-031
status: active
kind: component
authority: current
system: SYS-02
family: canvas-core
storybook: component
depends_on:
- DSK-006
- DSK-004
- APP-010
- DS-CAN
platforms:
- web
---

# DSK-031 — Contextual Minimap

Parent: [[DSK-002 — Canvas Viewport]]

## Purpose

Provides orientation and rapid navigation only when the Board has become spatially large enough that a minimap is genuinely useful.

It should not permanently consume Canvas chrome during normal close-up work.

## Context & placement

Floats at bottom-right in screen space.

Default visibility mode is **Auto**.

Initial Auto rule:
- appear when zoom is approximately 45% or lower **and** Board content extends materially beyond the current viewport;
- hide again once the GM returns to ordinary working scale.

[[DSK-006 — Canvas View Options]] can set Minimap to Auto, Always, or Off.

## Anatomy

- abstract miniature Board extents;
- lightweight silhouettes/marks for major Placements/Sections;
- current viewport rectangle;
- optional current selection emphasis.

Do not try to reproduce readable card content inside the minimap.

## Appearance & behaviour

Small, low contrast, and visually subordinate.

Clicking a region moves the camera there.

Dragging the viewport rectangle pans the Canvas.

The rectangle represents the physical Canvas viewport. Wide carriage overlays do not resize it; constrained shared-layout changes follow the actual Canvas bounds.

## States & variants

- hidden;
- Auto visible;
- Always visible;
- selection highlighted;
- very large Board.

## Relationships

- [[DSK-004 — Canvas Camera Navigation]] — camera movement.
- [[DSK-006 — Canvas View Options]] — Auto/Always/Off.
- [[APP-010 — Workspace Dock Manager]] — usable viewport geometry.
- [[BRD-011 — Board Preview Renderer]] — may share abstract spatial rendering logic.

## Handoff

Build **DSK-031 — Contextual Minimap** as a bottom-right overview that appears automatically only at sufficiently zoomed-out, spatially large Board states.
