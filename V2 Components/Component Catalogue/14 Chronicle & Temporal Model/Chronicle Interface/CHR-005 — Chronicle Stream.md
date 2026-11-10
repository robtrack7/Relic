---
id: CHR-005
status: active
kind: component
authority: current
system: SYS-14
family: chronicle-interface
storybook: component
depends_on:
- CHR-007
- CHR-001
- OBJ-EVT
- DS-TRUST
platforms:
- web
---

# CHR-005 — Chronicle Stream

Parent: [[CHR-004 — Chronicle Workspace State]]

## Purpose

Presents the ordered, story-significant history of the active Saga/World.

## Primary material

Chronicle may organize:
- Sessions as structural separators;
- Events as primary narrative occurrences;
- meaningful Story Changes;
- played Scenes as subordinate context where useful;
- pre-campaign/world history outside Sessions.

## Narrative filtering

Include story-significant history. Exclude routine:
- typo corrections;
- card movement;
- Board arrangement;
- AI runs;
- view settings;
- ordinary HP/resource decrements;
- software metadata edits.

## History outside Sessions

Support a broad section such as `Before the Campaign` or authored historical anchors. Chronicle ordering must not depend on every Event belonging to a played Session.

## Selection

Selecting an entry updates Story Position/context and can reveal [[CHR-007 — Chronicle Entry & Story Change Group]], affected objects, or as-of projections.

## Implementation latitude

The stream can virtualize, chunk by Session/era, or use derived summary groups for performance. Grouping may evolve as real campaign density becomes known. Do not encode visual grouping as the authoritative temporal hierarchy.

## Relationships

- [[CHR-001 — Story Time & Position Model]]
- [[CHR-007 — Chronicle Entry & Story Change Group]]
- [[OBJ-EVT — Event Representation Family]]
- [[PREP-005 — Scene & Beat Stack]]

## Handoff

Build **CHR-005** as a narrative projection over story history with adaptable grouping, not a write-authoritative timeline table.
