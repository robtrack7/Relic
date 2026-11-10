---
id: CHR-007
status: active
kind: component
authority: current
system: SYS-14
family: chronicle-interface
storybook: component
depends_on:
- REV-004
- OBJ-CHAR-13
- WOF-001
- DS-TRUST
platforms:
- web
---

# CHR-007 — Chronicle Entry & Story Change Group

Parent: [[CHR-005 — Chronicle Stream]]

## Purpose

Provides the readable Chronicle representation for one meaningful occurrence/change grouping.

## Sources

An entry may correspond to:
- persistent Event;
- Session Story Change from [[REV-004 — Session Change Set & Story Changes]];
- authored world-history occurrence;
- grouped temporal consequence where no dedicated Event identity is needed.

## Anatomy

As applicable:
- Story Position;
- title;
- concise consequence;
- affected World Object references;
- related Thread;
- originating Session;
- recent/change trace;
- provenance/evidence on demand.

## Object projections

Reuse family Chronicle/as-of representations rather than inventing a universal Chronicle card. Character uses [[OBJ-CHAR-13 — Character Chronicle Projection]]; other families use their Section 07 temporal projection strategy.

## Story Change relationship

Session Change Set is settlement/audit grouping. Chronicle entry is the story-facing projection. A Story Change may become a Chronicle entry without becoming a World Object.

## Implementation latitude

Entry and Story Change Group can be one component family, separate components, or data-driven variants depending implementation. Keep one semantic shape for selection/deep links and avoid duplicating domain family projections.

## Relationships

- [[REV-004 — Session Change Set & Story Changes]]
- [[OBJ-CHAR-13 — Character Chronicle Projection]]
- [[WOF-001 — Family Projection Standard]]

## Handoff

Build **CHR-007** as the story-facing grouping layer between raw temporal mutations and readable Chronicle narrative.
