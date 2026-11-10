---
id: DSK-009
status: active
kind: component
authority: current
system: SYS-02
family: canvas-tools
storybook: component
depends_on:
- BRD-007
- BRD-008
- DSK-014
- DS-CAN
platforms:
- web
---

# DSK-009 — Composition Tool Menu

Parent: [[DSK-007 — Canvas Tool Cluster]]

## Purpose

Creates things that help the GM arrange, annotate, and visually explain a Board without asserting new World canon.

This is the deliberate home for composition-only objects rather than hiding them under persistent world creation.

## Context & placement

Anchored above the bottom Compose tool in the Canvas Tool Cluster.

The chosen composition tool acts on the current Board only.

## Anatomy

Initial composition tools:
- [[BRD-007 — Board Section]];
- [[BRD-008 — Board Annotation]];
- [[DSK-014 — Decorative Connector Tool]];
- [[BRD-009 — Board Link Card]].

Future composition-only utilities should be added here only when they are genuinely spatial and Board-local.

## Appearance & behaviour

The menu should make the distinction from Create legible through wording and iconography without requiring explanatory prose.

A small caption such as "Board only" may help during early product learning.

Choosing Section or Annotation enters the corresponding placement/drawing action. Choosing Connector enters a short-lived connector draw mode. Choosing Board Link opens Board selection before placement.

## States & variants

- open;
- connector subtype available;
- Board chooser open for Board Link.

## Relationships

- [[DSK-007 — Canvas Tool Cluster]] — Compose entry.
- [[BRD-007 — Board Section]] — spatial organizer.
- [[BRD-008 — Board Annotation]] — lightweight text.
- [[DSK-014 — Decorative Connector Tool]] — non-semantic line/arrow creation.
- [[BRD-009 — Board Link Card]] — spatial navigation to another Board.

## Handoff

Build **DSK-009 — Composition Tool Menu** as the Board-only creation menu for Sections, annotations, decorative connectors, and Board links.
