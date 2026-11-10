---
id: BRD-002
status: active
kind: component
authority: current
system: SYS-02
family: boards
storybook: component
depends_on:
- BRD-011
- BRD-009
- BRD-005
- DS-CAN
platforms:
- web
---

# BRD-002 — Board Preview Tile

Parent: [[BRD-001 — Board Context Popover]]

## Purpose

Makes Boards visually recognizable by their spatial composition rather than relying only on names.

## Context & placement

Used inside Board switching/browsing surfaces and potentially reused inside Board Links.

## Anatomy

- miniature abstract composition preview;
- Board name;
- optional last-used cue;
- optional active indicator.

Do not render readable card bodies at thumbnail scale.

## Appearance & behaviour

Preview should resemble the overall spatial silhouette—clusters, images, Sections, major cards—without becoming a screenshot.

The Board name remains the primary accessible identifier.

Selecting opens the Board.

## Relationships

- [[BRD-011 — Board Preview Renderer]] — generates abstract preview.
- [[BRD-009 — Board Link Card]] — may reuse the preview.
- [[BRD-005 — Board Open & Restore]] — opens selected Board.

## Handoff

Build **BRD-002 — Board Preview Tile** as the recognition-first Board tile combining an abstract spatial preview with the Board name.
