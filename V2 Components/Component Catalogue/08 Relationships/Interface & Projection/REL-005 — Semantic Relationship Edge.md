---
id: REL-005
status: active
kind: component
authority: current
system: SYS-08
family: interface-projection
storybook: component
depends_on:
- DSK-015
- REL-003
- DSK-029
platforms:
- web
---

# REL-005 — Semantic Relationship Edge

Parent: [[SYS-08 — Relationships]]

## Purpose

Renders a Board-visible projection of a Semantic Relationship. It must remain clearly distinct from [[DSK-015 — Decorative Connector Edge]].

## Context & placement

Lives in Board/canvas coordinates and visually connects the relevant current Placements. The edge represents a persistent Relationship but is itself only a Board-local projection.

## Anatomy

- edge path;
- relationship label;
- endpoint anchors;
- optional direction indicator;
- selection/hover state;
- optional bundled/multiple-relationship indicator;
- proposal treatment where applicable.

## Appearance

Semantic edges are restrained, precise, and meaning-first: clear relationship label, controlled line geometry, and direction only where meaningful. Decorative connectors remain looser/editorial/annotation-like and have no semantic query meaning. The two systems must never be visually ambiguous.

## Direction

Do not show arrowheads merely because storage is directed. Relationship Type determines whether visual direction is meaningful. `member of` can benefit from direction; `allied with` is symmetric.

## Multiple relationships

Two objects may have several simultaneous Relationships. Do not render parallel spaghetti edges by default. Prefer one bundled edge such as `3 relationships`; selecting/deepening reveals the individual relationships. If one Relationship is foregrounded, show its semantic label directly.

## Interaction

Selecting an edge can expose semantic phrase, edit, history, provenance, and `Hide on this Board`. Editing semantic meaning invokes [[REL-003 — Relationship Composer]]. Routing/label-position edits remain Board-local where supported.

## Proposal state

Librarian/System proposed Relationships render through [[DSK-029 — Canvas Proposal Layer]] using dashed/ghosted treatment until accepted.

## Relationships

- [[REL-006 — Board Relationship Projection]]
- [[REL-003 — Relationship Composer]]
- [[DSK-015 — Decorative Connector Edge]]
- [[DSK-029 — Canvas Proposal Layer]]

## Handoff

Build **REL-005 — Semantic Relationship Edge** as the precise, labelled, optionally bundled Canvas projection of persistent Relationship identity.
