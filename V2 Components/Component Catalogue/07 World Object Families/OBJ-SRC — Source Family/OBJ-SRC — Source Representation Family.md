---
id: OBJ-SRC
status: active
kind: family
authority: current
system: SYS-07
family: source
storybook: none
---

# OBJ-SRC — Source Representation Family

Parent: [[SYS-07 — World Object Families]]

## Purpose

Defines the UI family for evidence, origin, reference, and imported material: PDFs, notes, transcripts, webpages, images, Markdown/text, handouts, rulebooks, campaign documents, and similar source material.

## Family emphasis

Source representations prioritize:
- recognizable title/origin;
- source type;
- preview/excerpt;
- provenance role;
- linked World Objects/claims;
- searchability;
- reference navigation.

A Source existing does not make its content canonically true.

## Projections

- [[OBJ-SRC-02 — Source Card]]
- [[OBJ-SRC-03 — Source Expanded Card]]
- [[OBJ-SRC-04 — Source Index Projection]]
- [[OBJ-SRC-01 — Source Viewer]]

## Actions

Possible actions:
- open Viewer;
- place on Board;
- pin/unpin Reference Shelf;
- search within;
- attach/link to World Object;
- copy citation/reference;
- re-index/retry import;
- archive/delete according to source lifecycle.

## Implementation rule

These files are catalogue/retrieval boundaries, not a requirement that production code use one module per projection. Share implementation where it is genuinely simpler while preserving projection semantics.
