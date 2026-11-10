---
id: DSK-006
status: active
kind: component
authority: current
system: SYS-02
family: canvas-core
storybook: component
depends_on:
- DSK-003
- DSK-022
- DSK-031
- DS-CAN
platforms:
- web
---

# DSK-006 — Canvas View Options

Parent: [[DSK-005 — View Controls]]

## Purpose

Holds low-frequency Canvas presentation preferences without expanding permanent viewport chrome.

## Context & placement

Anchored to View Controls and mounted as a small popover through the shared overlay system.

It overlays the Canvas and does not change viewport bounds.

## Anatomy

Initial options:
- Dot Grid: on/off;
- Snap to Grid: on/off;
- Alignment Guides: on/off;
- Minimap: Auto / Always / Off.

Avoid adding every future Canvas preference here by default.

## Appearance & behaviour

A compact list of clearly labelled toggles or segmented choices.

Settings take effect immediately and persist as user-level Canvas preferences unless a future requirement explicitly makes one Board-specific.

## States & variants

- open;
- default preferences;
- customized preferences.

## Relationships

- [[DSK-003 — Canvas Background & Dot Grid]] — grid visibility.
- [[DSK-022 — Alignment & Snap Guides]] — snap/guide preferences.
- [[DSK-031 — Contextual Minimap]] — Auto/Always/Off visibility preference.

## Handoff

Build **DSK-006 — Canvas View Options** as the compact preference popover for grid, snapping, guides, and minimap visibility.
