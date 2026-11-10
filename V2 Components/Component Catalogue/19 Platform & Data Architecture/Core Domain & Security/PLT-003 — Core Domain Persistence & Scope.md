---
id: PLT-003
status: active
kind: platform
authority: current
system: SYS-19
family: core-domain-security
storybook: none
---

# PLT-003 — Core Domain Persistence & Scope

Parent: [[SYS-19 — Platform & Data Architecture]]

## Purpose

Defines durable identity, family semantics and scope for persistent World Objects without forcing either unrelated family silos or an EAV database.

## World Object identity

Maintain a stable persistent identity layer for the eight World Object families:
- Character;
- Place;
- Faction;
- Artifact;
- Thread;
- Event;
- Source;
- Fragment.

Generic systems such as references, Placements, temporal resolution, Search and Librarian tools should be able to target that identity regardless of family.

## Typed family semantics

Family state must still be validated by typed/versioned domain schemas.

Avoid both extremes:
- eight unrelated persistence systems with no common identity contract;
- generic key/value EAV storage for all semantics.

## Recommended physical direction

A reasonable starting point is shared identity + typed/validated domain payload/state, potentially using JSONB for flexible family state plus first-class/indexed columns for high-value query fields.

Dedicated family extension tables are acceptable where relational querying or constraints justify them.

## Scope

Persistent content may be World- or Saga-scoped according to the domain rules.

Most play-created narrative state defaults to Saga scope. Do not prematurely implement cross-Saga branching/state overlays beyond the explicit World/Saga contract.

## Private material

Highly private content such as GM Notes should be stored/queried in a way that permits structurally stricter access than generic player-capable object projections.

Do not rely on CSS or client filtering to protect secrets.

## Revision

Persist a monotonic or otherwise reliable revision/version signal for semantic objects that participate in optimistic concurrency and Change Set validation.

## Flexibility

JSONB versus family extension tables is intentionally flexible. Preserve stable IDs, typed validation, scope, revisions and queryability while implementation learns which fields deserve relational structure.

## Handoff

Prototype representative Character, Thread, Event and Source persistence before locking a single physical strategy for every family.
