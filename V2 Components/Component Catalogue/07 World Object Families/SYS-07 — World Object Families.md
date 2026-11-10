---
id: SYS-07
status: active
kind: system
authority: current
system: SYS-07
storybook: none
---

# SYS-07 — World Object Families

## Purpose

Contains the canonical implementation specifications for Place, Faction, Artifact, Thread, Event, Source, and Fragment.

Character remains the reference exemplar in Section 04. Section 03 owns shared World Object representation infrastructure. Section 06 owns shared Focus infrastructure.

## Standard

All families follow [[WOF-001 — Family Projection Standard]].

The objective is implementation efficiency with cheap retrieval:
- one concise family packet per type;
- independently rendered projections may have their own small catalogue/Storybook contracts;
- file granularity does not require one-code-file-per-spec or separate production modules;
- split only where the projection/behavior can be independently designed, tested, or meaningfully retrieved.

## Family specifications

- [[OBJ-PLACE — Place Representation Family]]
- [[OBJ-FACT — Faction Representation Family]]
- [[OBJ-ART — Artifact Representation Family]]
- [[OBJ-THREAD — Thread Representation Family]]
- [[OBJ-EVT — Event Representation Family]]
- [[OBJ-SRC — Source Representation Family]]
- [[OBJ-FRAG — Fragment Representation Family]]

## Independent child specs

- [[OBJ-SRC-01 — Source Viewer]]
- [[OBJ-FRAG-01 — Resolve Fragment]]

## Handoff

Treat this folder as the coding-model entry point for all non-Character World Object family implementation work.

## Catalogue

### Artifact

- [[OBJ-ART — Artifact Representation Family]]
- [[OBJ-ART-02 — Artifact Card]]
- [[OBJ-ART-03 — Artifact Expanded Card]]
- [[OBJ-ART-04 — Artifact Focus]]
- [[OBJ-ART-05 — Artifact Index Projection]]
- [[OBJ-ART-06 — Artifact Prepare Projection]]
- [[OBJ-ART-07 — Artifact Chronicle Projection]]

### Event

- [[OBJ-EVT — Event Representation Family]]
- [[OBJ-EVT-02 — Event Card]]
- [[OBJ-EVT-03 — Event Expanded Card]]
- [[OBJ-EVT-04 — Event Focus]]
- [[OBJ-EVT-05 — Event Index Projection]]
- [[OBJ-EVT-06 — Event Chronicle Projection]]

### Faction

- [[OBJ-FACT — Faction Representation Family]]
- [[OBJ-FACT-02 — Faction Card]]
- [[OBJ-FACT-03 — Faction Expanded Card]]
- [[OBJ-FACT-04 — Faction Focus]]
- [[OBJ-FACT-05 — Faction Index Projection]]
- [[OBJ-FACT-06 — Faction Chronicle Projection]]

### Fragment

- [[OBJ-FRAG — Fragment Representation Family]]
- [[OBJ-FRAG-01 — Resolve Fragment]]
- [[OBJ-FRAG-02 — Fragment Marker]]
- [[OBJ-FRAG-03 — Fragment Card]]
- [[OBJ-FRAG-04 — Fragment Expanded Card]]
- [[OBJ-FRAG-05 — Fragment Focus]]
- [[OBJ-FRAG-06 — Fragment Index Projection]]

### Place

- [[OBJ-PLACE — Place Representation Family]]
- [[OBJ-PLACE-02 — Place Card]]
- [[OBJ-PLACE-03 — Place Expanded Card]]
- [[OBJ-PLACE-04 — Place Focus]]
- [[OBJ-PLACE-05 — Place Index Projection]]
- [[OBJ-PLACE-06 — Place Prepare Projection]]
- [[OBJ-PLACE-07 — Place Chronicle Projection]]

### Source

- [[OBJ-SRC — Source Representation Family]]
- [[OBJ-SRC-01 — Source Viewer]]
- [[OBJ-SRC-02 — Source Card]]
- [[OBJ-SRC-03 — Source Expanded Card]]
- [[OBJ-SRC-04 — Source Index Projection]]

### Standards

- [[WOF-001 — Family Projection Standard]]

### Thread

- [[OBJ-THREAD — Thread Representation Family]]
- [[OBJ-THREAD-02 — Thread Card]]
- [[OBJ-THREAD-03 — Thread Expanded Card]]
- [[OBJ-THREAD-04 — Thread Focus]]
- [[OBJ-THREAD-05 — Thread Index Projection]]
- [[OBJ-THREAD-06 — Thread Prepare Projection]]
- [[OBJ-THREAD-07 — Thread Chronicle Projection]]
