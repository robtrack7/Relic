---
id: REL-006
status: active
kind: behavior
authority: current
system: SYS-08
family: domain
storybook: none
depends_on:
- BRD-006
- REL-005
- DSK-012
---

# REL-006 — Board Relationship Projection

Parent: [[SYS-08 — Relationships]]

## Purpose

Defines how persistent Semantic Relationships become visible, hidden, routed, and emphasized on individual Boards without making Board composition the source of semantic truth.

## Core rule

A Semantic Relationship may exist with zero, one, or several Board projections. Relationship identity belongs to its valid World/Saga scope. Board projection is local composition.

## Creation behavior

**Created through Canvas Connect:** create the Semantic Relationship and a visible Board-local edge projection between the current Placements. **Created through Focus/Review/Librarian approval:** create the Semantic Relationship only. Do not automatically draw edges on every Board containing both endpoints; the GM can later choose `Show on this Board`.

## Board-local state

A Board Relationship Projection may own visibility, route geometry, label position, z-order/emphasis, bundled-edge layout, and local muted/foreground state. It must not own predicate, semantic direction, provenance, temporal validity, or story truth.

## Contextual visibility

Avoid graph overload. Explicitly placed edges remain visible. Selecting an object may temporarily reveal other co-placed Relationships. View Options can expose semantic-edge visibility controls. Do not default to showing every relationship everywhere.

## Endpoint movement

Moving a Placement updates projected edge geometry. Removing a Placement from a Board removes/hides that Board projection but does not delete the Semantic Relationship. If one endpoint is absent, no ordinary full edge renders.

## Show on this Board

If both endpoint objects have current Board Placements, the GM can explicitly show an existing Relationship. If one endpoint is missing, Relic can offer to place that object here, but must not silently duplicate/place it.

## Relationships

- [[BRD-006 — Placement Host]]
- [[REL-005 — Semantic Relationship Edge]]
- [[DSK-012 — Semantic Connect Interaction]]
- [[DSK-006 — Canvas View Options]]

## Handoff

Implement **REL-006 — Board Relationship Projection** as the Board-local visibility/routing layer around persistent Semantic Relationships.
