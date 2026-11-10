---
id: BRD-001
status: active
kind: component
authority: current
system: SYS-02
family: boards
storybook: component
depends_on:
- BRD-005
- BRD-002
- BRD-003
- DS-CAN
platforms:
- web
---

# BRD-001 — Board Context Popover

Parent: [[APP-005 — Current Context Control]]

## Purpose

Provides Desk-local Board switching and Board context without adding a permanent Board sidebar or another large navigation surface.

## Context & placement

Opened from Current Context while the Desk is active.

Anchored to the upper working frame and mounted through the global overlay host.

## Anatomy

- current Board identity;
- recent Boards;
- searchable/all Boards list when needed;
- Create Board;
- Board Actions;
- active lens entry/switching where relevant.

The popover should remain much lighter than Library.

## Appearance & behaviour

Favor names plus small visual previews over administrative metadata.

Selecting another Board invokes [[BRD-005 — Board Open & Restore]] and closes the popover.

The list should scale from a few Boards to many without forcing the user into a permanent panel.

## Relationships

- [[APP-005 — Current Context Control]] — opens this Board-specific content.
- [[BRD-002 — Board Preview Tile]] — Board recognition.
- [[BRD-003 — Create Board]] — new Board flow.
- [[BRD-004 — Board Actions Menu]] — management actions.

## Handoff

Build **BRD-001 — Board Context Popover** as the compact Desk-local Board switcher and management entry.
