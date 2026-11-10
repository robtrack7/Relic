---
id: OBJ-FACT-04
status: active
kind: component
authority: current
system: SYS-07
family: faction
storybook: component
depends_on:
- WOF-001
- OBJ-002
- OBJ-015
platforms:
- web
---

# OBJ-FACT-04 — Faction Focus

Parent: [[OBJ-FACT — Faction Representation Family]]

## Purpose

Recommended Faction Focus:

1. Identity
2. Media / emblem
3. Narrative
4. Goals & Motives
5. Status
6. Territory / Locations
7. Leadership and members
8. Relationships
9. Threads
10. Holdings / Resources
11. Event History
12. GM Notes
13. Sources & Provenance

Primary shared blocks:
- Identity
- Image & Media
- Narrative
- Goals & Motives
- Status
- Location
- Relationships
- Thread Membership
- Inventory & Holdings
- Event History
- GM Notes
- Sources & Provenance

Faction-specific leadership/member presentation can be composed as relationship-focused subgroups rather than a separate isolated member database.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Faction content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
