---
id: SRH-004
status: active
kind: component
authority: current
system: SYS-09
family: search
storybook: component
depends_on:
- FOC-010
- OBJ-SRC-01
- SRH-002
platforms:
- web
---

# SRH-004 — Search Result Match Context

Parent: [[SYS-09 — Search & Library]]

## Purpose

Shows why a result matched when the query was found inside content rather than only in the object's title or name.

## Anatomy

- short excerpt;
- highlighted match;
- content location;
- optional source/provenance cue.

Possible locations:
- Focus section;
- PDF page;
- transcript timestamp/segment;
- Source text anchor;
- Event narrative;
- Fragment body.

## Examples

Character content match:

**Seraphine Valdrus**  
`…she gave Mara the Iron Deed before leaving Brassgate…`  
Narrative

PDF match:

**Core Rules**  
`…a reaction can be used when…`  
p. 184

## Behaviour

Activation opens the closest stable deep-link target:
- [[FOC-010 — Focus Anchor & Deep Link]];
- [[OBJ-SRC-01 — Source Viewer]];
- other addressable system target.

Keep excerpts short enough to scan.

## Relationships

- [[SRH-002 — Quick Search Results]]
- [[SRH-003 — Full Search Surface]]
- [[OBJ-SRC-01 — Source Viewer]]

## Handoff

Build **SRH-004 — Search Result Match Context** as the reusable highlighted excerpt/location component for body/source matches.
