---
id: REL-009
status: active
kind: domain
authority: current
system: SYS-08
family: domain
storybook: none
depends_on:
- REL-001
- REL-002
- REL-007
---

# REL-009 — Relationship Resolver

Parent: [[SYS-08 — Relationships]]

## Purpose

Provides one shared relationship-query/resolution service so Focus, Canvas, Chronicle, Search, Prepare, Stage, and Librarian do not independently reconstruct inverse phrases, symmetric semantics, scope, or historical validity.

## Inputs

May include focal World Object ID, scope/Saga, story position/Now, predicate/category filter, endpoint family/type filter, active Session context, authorization/visibility, include-ended/history mode, and Board context when projection state is relevant.

## Normalized output

Outputs Relationships from the focal object's perspective. Stored `Mara — member-of — Lantern Society` resolves from Mara as `is a member of → Lantern Society` and from Lantern Society as `has member → Mara`. Same underlying identity.

## Symmetric output

For symmetric types, both perspectives use the same or appropriately natural phrase, e.g. `is allied with → other`.

## Historical resolution

At a selected story position, return only Relationships story-valid then unless history mode explicitly requests ended/future records. This powers historical Focus, Faction membership, Chronicle, Librarian as-of questions, and Event consequence/history views.

## Board projection query

When Board context is supplied, resolver may additionally indicate endpoint Placements present and whether a Board projection exists/is visible. Semantic result remains separate from Board geometry.

## Authorization

Only return Relationships and endpoint details the current user is authorized to access. Prompt-level filtering is never the permission boundary.

## Relationships

- [[REL-001 — Semantic Relationship Model]]
- [[REL-002 — Relationship Type Registry]]
- [[REL-007 — Relationship Temporal History]]
- [[REL-006 — Board Relationship Projection]]

## Handoff

Implement **REL-009 — Relationship Resolver** as the single focal-perspective, as-of-aware, authorization-safe Relationship query layer.
