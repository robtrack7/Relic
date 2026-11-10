---
id: CHR-003
status: active
kind: domain
authority: current
system: SYS-14
family: temporal-core
storybook: none
depends_on:
- CHR-001
- CHR-002
- CHR-010
---

# CHR-003 — Temporal Resolver & Now Projection

Parent: [[SYS-14 — Chronicle & Temporal Model]]

## Purpose

Provides the canonical contract for resolving an identity or semantic relationship at a requested Story Position and truth-layer mode.

## Conceptual input

- identity / relationship reference;
- Saga/World scope;
- Story Position;
- authorization;
- truth-layer mode;
- optional projection needs.

## Conceptual output

- story-valid projected state;
- valid Relationships;
- temporal property values;
- relevant provenance/change references;
- historical/pending indicators needed by the caller.

## As-of guarantee

Historical projection must never leak future state.

For a Character this includes future Knowledge, allegiance, Relationships, location, holdings, status, and other declared temporal semantics.

## Now fast path

Ordinary Desk, Search, Stage, and Focus use Now constantly. Now must remain the optimized/default path.

Historical resolution may do additional reconstruction. Section 19 can choose materialization/cache strategy.

## Single semantic contract

Focus, Chronicle, Relationships, Search, Librarian, Settlement comparison, and future Player history should call the same temporal semantics rather than reconstructing history independently.

## Implementation latitude

`Temporal Resolver` is a **logical service boundary**, not a mandate for one monolithic class/process. Codex may split current-state read models, historical projection, relationship resolution, caching, and comparison helpers while exposing one coherent contract to callers.

## Relationships

- [[CHR-001 — Story Time & Position Model]]
- [[CHR-002 — Temporal State Model]]
- [[CHR-010 — Temporal Truth Layers]]
- [[REL-009 — Relationship Resolver]]

## Platform resolver owner

Physical temporal storage/caching is owned by [[PLT-004 — Temporal State & Change-Set Transaction Engine]]. This product contract does not require a particular snapshot/event-table shape.

## Handoff

Implement the resolver contract and tests around temporal correctness first; optimize Now separately without changing historical semantics.
