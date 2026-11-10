---
id: DSK-025
status: active
kind: component
authority: current
system: SYS-02
family: selection-placement
storybook: component
depends_on:
- DSK-008
- DSK-009
- DSK-010
- DS-CAN
platforms:
- web
---

# DSK-025 — Canvas Context Menu

Parent: [[DSK-002 — Canvas Viewport]]

## Purpose

Provides a spatially natural right-click/equivalent action surface on blank Canvas space.

## Context & placement

Appears at the pointer in screen space over the blank Canvas.

Newly created content uses the corresponding world-space point as its initial placement where practical.

## Anatomy

Likely actions:
- New Fragment;
- Create World Material…;
- Compose…;
- Paste when clipboard content is supported;
- New Section;
- New Annotation;
- Board Link;
- Fit Board;
- View Options.

Avoid duplicating the entire Relic Menu or Board management menu.

## Appearance & behaviour

Compact and optimized for experienced spatial work.

The most useful capture action, New Fragment, should be near the top.

Unavailable clipboard actions can be hidden rather than filling the menu with disabled rows.

## Relationships

- [[DSK-008 — Create World Material Menu]] — persistent creation.
- [[DSK-009 — Composition Tool Menu]] — Board-only creation.
- [[DSK-010 — Blank Canvas Quick Capture]] — faster double-click capture.
- [[APP-011 — Global Overlay Host]] — menu mounting.

## Handoff

Build **DSK-025 — Canvas Context Menu** as the pointer-anchored blank-Canvas menu for capture, creation, composition, paste, and view actions.
