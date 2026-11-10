---
id: CHR-009
status: active
kind: component
authority: current
system: SYS-14
family: chronicle-interface
storybook: component
depends_on:
- REV-006
- CHR-003
- CHR-010
- DS-TRUST
platforms:
- web
---

# CHR-009 — Temporal Compare

Parent: [[SYS-14 — Chronicle & Temporal Model]]

## Purpose

Answers the human question **what changed?** between two Story Positions using semantic differences.

## Modes

Support useful comparisons such as:
- Then ↔ Now;
- Session 8 ↔ Session 14;
- before Event ↔ after Event;
- pre-settlement ↔ settled state where appropriate.

## Presentation

Show meaningful semantic differences, e.g.:
- allegiance;
- location;
- Knowledge;
- active/ended Relationships;
- status/Thread state.

Do not expose raw JSON patches as the primary UI.

## Entry points

- [[REV-006 — Recent Change & Temporal Trace]];
- object History;
- Chronicle;
- Librarian;
- Settlement audit.

## Truth layers

Comparison labels must identify whether either side is Pending rather than Settled.

## Implementation latitude

Comparison may reuse projection resolver outputs and a generic semantic differ, plus family-specific summarizers where generic comparison is poor. Avoid forcing one universal diff renderer across every domain.

## Relationships

- [[CHR-003 — Temporal Resolver & Now Projection]]
- [[CHR-010 — Temporal Truth Layers]]
- [[REV-006 — Recent Change & Temporal Trace]]

## Handoff

Build **CHR-009** from resolved story states and human semantic diffs; permit family specialization where useful.
