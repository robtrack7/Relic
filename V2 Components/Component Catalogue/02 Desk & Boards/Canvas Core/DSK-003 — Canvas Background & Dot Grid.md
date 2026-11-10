---
id: DSK-003
status: active
kind: component
authority: current
system: SYS-02
family: canvas-core
storybook: component
depends_on:
- DSK-006
- DSK-022
- DS-CAN
platforms:
- web
---

# DSK-003 — Canvas Background & Dot Grid

Parent: [[DSK-002 — Canvas Viewport]]

## Purpose

Provides the quiet visual field beneath Board content and a subtle spatial reference for movement and alignment.

The grid should help orientation without visually turning Relic into Figma, CAD, or a flowchart product.

## Context & placement

Covers the entire Canvas world-space background behind all Placements and composition objects.

The grid moves and scales coherently with the camera. It is not a fixed screen-space texture.

## Anatomy

- warm neutral canvas field;
- very small, restrained dot pattern;
- optional hidden-grid state.

No rulers, axes, coordinates, major/minor engineering grid, or visible page boundaries by default.

## Appearance & behaviour

Dots remain low contrast and visually subordinate to cards and imagery.

At extreme zoom levels the grid may simplify or fade to avoid moiré and visual noise.

Grid visibility is controlled through [[DSK-006 — Canvas View Options]] and is a user view preference, not World canon or Board content.

## States & variants

- grid visible;
- grid hidden;
- extreme zoom simplification.

## Relationships

- [[DSK-006 — Canvas View Options]] — toggles grid visibility.
- [[DSK-022 — Alignment & Snap Guides]] — may optionally snap to the same underlying spacing without requiring the dots to be visible.

## Handoff

Build **DSK-003 — Canvas Background & Dot Grid** as the quiet, zoom-aware working field beneath all Board composition.
