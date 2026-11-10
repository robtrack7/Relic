---
id: OBJ-PLACE-04
status: active
kind: component
authority: current
system: SYS-07
family: place
storybook: component
depends_on:
- WOF-001
- OBJ-002
- OBJ-015
platforms:
- web
---

# OBJ-PLACE-04 — Place Focus

Parent: [[OBJ-PLACE — Place Representation Family]]

## Purpose

Recommended Place Focus composition:

1. Identity
2. Image & Media / Maps
3. Narrative
4. Status
5. Location hierarchy
6. Important relationships / inhabitants
7. Threads
8. Event History
9. Important contents / holdings
10. GM Notes
11. Sources & Provenance
12. Related References where useful

Primary shared blocks:
- [[FOC-BLK-001 — Identity Block]]
- [[FOC-BLK-002 — Image & Media Block]]
- [[FOC-BLK-003 — Narrative Block]]
- [[FOC-BLK-006 — Status Block]]
- [[FOC-BLK-013 — Location Block]]
- [[FOC-BLK-009 — Relationships Block]]
- [[FOC-BLK-010 — Thread Membership Block]]
- [[FOC-BLK-011 — Event History Block]]
- [[FOC-BLK-012 — Inventory & Holdings Block]]
- [[FOC-BLK-015 — GM Notes Block]]
- [[FOC-BLK-014 — Sources & Provenance Block]]

Place Focus should allow maps/media to carry more visual weight than they do in most other families.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Place content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
