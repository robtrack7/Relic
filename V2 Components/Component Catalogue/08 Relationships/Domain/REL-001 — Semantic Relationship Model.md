---
id: REL-001
status: active
kind: domain
authority: current
system: SYS-08
family: domain
storybook: none
depends_on:
- REL-002
---

# REL-001 — Semantic Relationship Model

Parent: [[SYS-08 — Relationships]]

## Purpose

Defines the canonical semantic model for meaningful binary relationships between persistent World Objects. A Relationship expresses a fictional claim that should read naturally as `Subject → Predicate → Object`, for example: Mara **owes a debt to** Seraphine; Mara **is a member of** the Lantern Society; House Valdrus **controls** North Gate. A Relationship is semantic world data, not merely a visual connector.

## Core fields

A Relationship should conceptually include: stable Relationship identity; subject World Object; predicate/type; object World Object; story-valid state; optional notes; scope; provenance; temporal validity/history; and transaction/audit history. The exact persistence schema can be finalized in the backend/domain pass, but the product contract must preserve these concepts.

## Identity boundary

Relationship is first-class semantic data but **not a World Object family**. It does not receive Marker, Card, generic Focus, or Library entity entry. It has specialized projections such as [[REL-004 — Relationship Row]] and [[REL-005 — Semantic Relationship Edge]]. Relationship identity persists independently of any Board edge projection.

## Relationship versus mention

A Mention means that a World Object was referenced in text/source material. A Relationship means that a meaningful semantic connection is asserted between two World Objects. Mentions may help Search/Librarian propose Relationships, but a Mention never automatically becomes a Relationship.

## Scope

Recommended rule: if both endpoints are World-scoped, the Relationship may be World-scoped; if either endpoint is Saga-scoped, the Relationship is Saga-scoped. Ordinary cross-Saga and cross-World Relationships are not allowed. This prevents a Saga-specific claim from silently becoming globally true.

## Temporal model

Relationships can begin, end, recur, and change through story time. Ordinary Desk/Stage queries resolve the **Now** state. Chronicle and historical Focus resolve the same Relationship identity as-of a selected story position. Ending a Relationship preserves that it was previously true.

## Boundaries

Do not flatten every product association into this model. Keep specialized systems for Source provenance, Board Placements, Session pinning, Event story position, Knowledge states, and other associations whose richer structure deserves its own domain model.

## Relationships

- [[REL-002 — Relationship Type Registry]] — predicate semantics.
- [[REL-007 — Relationship Temporal History]] — validity over time.
- [[REL-008 — Relationship Provenance & Proposal]] — evidence/proposal state.
- [[REL-009 — Relationship Resolver]] — normalized queries.

## Handoff

Implement **REL-001 — Semantic Relationship Model** as stable subject–predicate–object semantic identity independent of Canvas projection.
