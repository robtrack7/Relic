---
id: SYS-08
status: active
kind: system
authority: current
system: SYS-08
storybook: none
---

# SYS-08 — Relationships

## Purpose

Owns Relic's meaningful semantic connections between World Objects, including predicate vocabulary, creation/editing, Focus rows, Canvas projections, temporal history, provenance, AI proposals, and shared relationship resolution.

## Core rules

- Relationship is `Subject → Predicate → Object`.
- Relationship is semantic data, not a World Object family.
- Mentions do not automatically become Relationships.
- Built-in predicates are extensible through custom reusable Relationship Types.
- Forward/inverse wording is part of the Relationship Type.
- Symmetric Relationships store one semantic Relationship.
- One Relationship can have zero or many Board projections.
- Canvas-created Relationships normally create a local Board edge projection.
- Focus-created Relationships do not automatically draw themselves across Boards.
- Semantic edges and decorative connectors are separate systems.
- Relationship history is preserved.
- End means `stopped being true`; correction means `was not story-valid`.
- Provenance survives.
- AI inferred Relationships remain proposals until approved according to autonomy mode.
- No relationship graph is included in current V2.

## Catalogue

### Domain

- [[REL-001 — Semantic Relationship Model]]
- [[REL-002 — Relationship Type Registry]]
- [[REL-006 — Board Relationship Projection]]
- [[REL-007 — Relationship Temporal History]]
- [[REL-008 — Relationship Provenance & Proposal]]
- [[REL-009 — Relationship Resolver]]

### Interface Projection

- [[REL-003 — Relationship Composer]]
- [[REL-004 — Relationship Row]]
- [[REL-005 — Semantic Relationship Edge]]
