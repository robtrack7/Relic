---
id: SRH-005
status: active
kind: component
authority: current
system: SYS-09
family: search
storybook: component
depends_on:
- SRH-001
- SRH-003
- LIB-004
platforms:
- web
---

# SRH-005 — Search Scope & Filters

Parent: [[SYS-09 — Search & Library]]

## Purpose

Provides lightweight shared filtering for Search without exposing retrieval-engine implementation details.

## Scope controls

Primary scope choices:
- Saga + World — default;
- Saga;
- World.

Avoid exposing broader cross-Saga/cross-World scopes until those workflows are explicitly designed.

## Type filters

World:
- Character;
- Place;
- Faction;
- Artifact;
- Thread;
- Event;
- Fragment.

Other:
- Source;
- Board;
- Session.

## Conditional filters

Reveal only when relevant.

Examples:

**Source**
- PDF;
- Web;
- Transcript;
- Image;
- Notes.

**World Objects**
- Pencil / Ink;
- archived.

**Thread**
- family-defined status.

## Boundaries

Do not expose:
- Literal / Semantic toggle;
- embedding mode;
- full-text mode;
- similarity threshold;
- raw database facets.

Retrieval strategy is implementation detail.

## Relationships

- [[SRH-001 — Search System]]
- [[SRH-003 — Full Search Surface]]
- [[LIB-004 — Library Filter Bar]]

## Handoff

Build **SRH-005 — Search Scope & Filters** as the small context-aware scope/type filtering model shared by Search surfaces.
