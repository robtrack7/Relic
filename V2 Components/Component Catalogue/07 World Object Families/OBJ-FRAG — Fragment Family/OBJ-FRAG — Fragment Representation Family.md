---
id: OBJ-FRAG
status: active
kind: family
authority: current
system: SYS-07
family: fragment
storybook: none
---

# OBJ-FRAG — Fragment Representation Family

Parent: [[SYS-07 — World Object Families]]

## Purpose

Defines the UI family for Relic's lowest-friction persistent thought object.

A Fragment can exist before the GM knows what it is: a name, sentence, question, quote, image, promise, hypothesis, session capture, scrap of lore, or unclassified idea.

## Family emphasis

Fragment prioritizes:
- immediate capture;
- minimal required structure;
- direct editing;
- provenance;
- visible unfinished/Pencil quality where appropriate;
- later resolution without loss of history.

A Fragment is persistent and real even when unresolved.

## Projections

- [[OBJ-FRAG-02 — Fragment Marker]]
- [[OBJ-FRAG-03 — Fragment Card]]
- [[OBJ-FRAG-04 — Fragment Expanded Card]]
- [[OBJ-FRAG-05 — Fragment Focus]]
- [[OBJ-FRAG-06 — Fragment Index Projection]]
- [[OBJ-FRAG-01 — Resolve Fragment]]

## Actions

Possible actions:
- edit;
- Focus/expand;
- Resolve;
- link Relationship;
- add to Session;
- move/place on Board;
- archive/delete according to lifecycle.

## Implementation rule

These files are catalogue/retrieval boundaries, not a requirement that production code use one module per projection. Share implementation where it is genuinely simpler while preserving projection semantics.
