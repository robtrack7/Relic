---
id: REL-002
status: active
kind: domain
authority: current
system: SYS-08
family: domain
storybook: none
---

# REL-002 — Relationship Type Registry

Parent: [[SYS-08 — Relationships]]

## Purpose

Defines reusable semantic predicate types, including natural-language direction, inverse phrasing, symmetry, grouping, and optional compatibility hints. This supersedes the older assumption that Relationships are limited to a small fixed enum.

## Type definition

Each type may declare: stable predicate key; forward phrase; inverse phrase; directed or symmetric semantics; category/group; optional icon; optional endpoint compatibility hints; whether concurrent duplicates are allowed; and optional presentation grouping labels. Example: `member-of` → forward `is a member of`, inverse `has member`, directed. Example: `allied-with` → forward/inverse `is allied with`, symmetric.

## Built-in vocabulary

Ship a practical vocabulary so most GMs never need configuration. Useful groups include **Social** (knows, friend of, sibling of, parent of, married to, rivals with, owes a debt to, serves, commands, mentors), **Faction/political** (member of, leads, allied with, opposed to, controls, vassal of), **Spatial** (located at, located within, adjacent to, originates from), **Possession** (owns, held by, carries, created by), and **Narrative** (involved with, threatened by, protects, seeks). Keep it useful rather than exhaustive.

## Custom predicate creation

A GM can type a new predicate directly in Relationship Composer, e.g. `is secretly blackmailing`. Relic can ask for or suggest the inverse phrase, e.g. `is being secretly blackmailed by`, then save the predicate for reuse. Custom Relationship Types do not imply custom World Object types.

## Compatibility

Endpoint compatibility should normally be advisory rather than a rigid schema wall. Relic can rank sensible predicates first—such as Character → member of → Faction—while still allowing unusual fiction when the GM intends it.

## Presentation grouping

Type categories can help Focus group rows into readable sections such as Family, Allegiances, Politics, Ownership, Territory, and Debts & obligations. Grouping is presentation metadata derived from Relationship Types, not separate data storage.

## Relationships

- [[REL-003 — Relationship Composer]]
- [[REL-004 — Relationship Row]]
- [[REL-005 — Semantic Relationship Edge]]
- [[REL-009 — Relationship Resolver]]

## Handoff

Implement **REL-002 — Relationship Type Registry** as the reusable built-in/custom predicate catalogue with natural forward/inverse semantics.
