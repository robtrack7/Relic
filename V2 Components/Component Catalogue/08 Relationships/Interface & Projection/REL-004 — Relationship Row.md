---
id: REL-004
status: active
kind: component
authority: current
system: SYS-08
family: interface-projection
storybook: component
depends_on:
- REL-001
- REL-002
- OBJ-010
- DS-TRUST
platforms:
- web
---

# REL-004 — Relationship Row

Parent: [[SYS-08 — Relationships]]

## Purpose

Provides the canonical non-Canvas representation of a Semantic Relationship from the perspective of a focused/host World Object.

## Perspective

Relationship Row renders natural language from the focal object's perspective. Stored `Mara — owes-a-debt-to — Seraphine` becomes `Owes a debt to · Seraphine` from Mara Focus and `Is owed a debt by · Mara` from Seraphine Focus. Same Relationship identity.

## Anatomy

- semantic phrase;
- related World Object reference;
- optional image/type cue;
- optional current/historical state;
- provenance cue when important;
- history indicator where relevant.

## Grouped presentation

Hosts such as [[FOC-BLK-009 — Relationships Block]] can group rows using Relationship Type categories. Character examples: Family, Allegiances, Debts & obligations. Faction examples: Leadership, Members, Politics. Grouping is derived presentation rather than separate data silos.

## Behaviour

Activate the related World Object to Peek/Focus. Activate the relationship meaning to edit/inspect. Open history when temporal. Inspect provenance where available. Archived/unavailable endpoints use shared object-reference fallbacks.

## States & variants

- current;
- historical/as-of;
- ended/former;
- proposed;
- provenance-present;
- archived/unavailable endpoint.

## Relationships

- [[OBJ-010 — Inline Object Reference]]
- [[FOC-BLK-009 — Relationships Block]]
- [[REL-002 — Relationship Type Registry]]
- [[REL-007 — Relationship Temporal History]]
- [[REL-009 — Relationship Resolver]]

## Handoff

Build **REL-004 — Relationship Row** as the natural-language focal-perspective representation used throughout Focus and contextual UI.
