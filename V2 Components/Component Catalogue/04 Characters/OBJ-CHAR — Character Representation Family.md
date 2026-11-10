---
id: OBJ-CHAR
status: active
kind: family
authority: current
system: SYS-04
family: character
storybook: none
---

# OBJ-CHAR — Character Representation Family

Parent: [[SYS-03 — World Objects & Cards]]

## Purpose

Defines the separately coded representations of persistent Character identity across Relic. NPCs and PCs use the same identity model; PC is a subtype/role rather than a parallel entity system.

## Representations

### Spatial disclosure
- [[OBJ-CHAR-01 — Character Marker]]
- [[OBJ-CHAR-02 — Character Card]]
- [[OBJ-CHAR-03 — Expanded Character Card]]
- [[OBJ-CHAR-06 — Character Focus]]

Primary Desk disclosure chain: `simplified Small Character Card ↔ Small Character Card → Expanded Character Card → right-side Character Focus`. The far representation is semantic zoom of the Small Card. Expanded Character Card is one bounded surface; it has no user-facing mechanics back or flip state. Deep authoring continues in Entity Builder from Focus or Library.

### Retrieval / preparation
- [[OBJ-CHAR-07 — Character Index Projection]]
- [[OBJ-CHAR-07 — Character Index Projection]]
- [[OBJ-CHAR-09 — Character Prepare Row]]
- [[OBJ-CHAR-10 — Character Prepare Card]]

### Stage
- [[OBJ-CHAR-11 — Character Stage Bubble]] — compact Stage Entity Rail shortcut.
- [[STG-005 — Stage Entity Rail]] — navigates to the **same Character Card / Expanded Character Card** on the central Canvas.

There is intentionally no duplicate full Stage-side Character card component.

### Temporal
- [[OBJ-CHAR-13 — Character Chronicle Projection]]

## Shared family components / behaviours
- [[OBJ-003 — Representation Transition Coordinator]]
- [[OBJ-CHAR-15 — Character Roleplay Snapshot]]
- [[OBJ-CHAR-16 — Character Mechanical Summary]]
- [[OBJ-CHAR-17 — Character Knowledge Snapshot]]
- [[OBJ-CHAR-18 — Character Relationship Snapshot]]
- [[OBJ-CHAR-19 — Character Current State Summary]]
- [[OBJ-CHAR-20 — Character Session Relevance Cue]]
- [[OBJ-CHAR-21 — Character Action Contributions]]

## Shared family identity

Preserve recognition through name, portrait/image when available, role/identity phrase, type cues, and maturity treatment. Information density changes radically while identity remains recognizable.

## Mechanics

Character mechanics use [[MEC-001 — Mechanics Framework]]. Relic's Character Focus shell remains designed and stable while the mechanics block is template-driven and customizable by game system.

## Relationships
- [[OBJ-001 — World Object Representation Framework]] — shared projection model.
- [[OBJ-002 — World Object Projection Resolver]] — selects Character projection.
- [[OBJ-003 — Representation Transition Coordinator]] — common visual transition layer.
- [[MEC-001 — Mechanics Framework]] — system-flexible mechanics.

## Handoff

Use **OBJ-CHAR — Character Representation Family** as the router and consistency contract for all separately implemented Character projections.
