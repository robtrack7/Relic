---
id: REL-008
status: active
kind: behavior
authority: current
system: SYS-08
family: domain
storybook: none
depends_on:
- DSK-029
- FOC-BLK-014
- OBJ-SRC-01
---

# REL-008 — Relationship Provenance & Proposal

Parent: [[SYS-08 — Relationships]]

## Purpose

Preserves evidence/origin for Semantic Relationships and defines how AI/system-inferred Relationships remain proposals until appropriately approved.

## Provenance

A Relationship may be supported by direct GM entry, Event, Session, transcript excerpt, imported Source, GM note, Librarian inference/proposal, or other authorized evidence. Normal Rows/Edges should not become citation-heavy; provenance appears on inspection or when confidence/traceability matters.

## Proposal behavior

In default Supervised mode, Librarian inference is not settled semantic truth. Proposal UI can appear in Canvas Proposal Layer, Review/Settlement, Librarian action proposal, or Focus relationship suggestion. The GM can Apply, Edit, or Dismiss.

## Canvas proposal

A proposed Relationship uses [[DSK-029 — Canvas Proposal Layer]] with dashed/ghosted edge treatment and proposed semantic phrase. Applying commits the semantic Relationship, preserves provenance, settles the Board projection when applicable, and records one coherent action/change set.

## Source inspection

Relationship inspection can expose Source title, Session, Event, transcript/text excerpt, or Librarian explanation. The Source remains independently addressable through Source Viewer/provenance systems.

## Truth boundary

Provenance is not equivalent to truth. AI authorship is not equivalent to falsehood. Direct GM authorship is not automatically a special truth category. Story-valid status and supporting evidence remain separate concerns.

## Relationships

- [[DSK-029 — Canvas Proposal Layer]]
- [[FOC-BLK-014 — Sources & Provenance Block]]
- [[OBJ-SRC-01 — Source Viewer]]
- [[APP-012 — Global Action Receipt]]
- Review & Settlement
- Librarian

## Handoff

Implement **REL-008 — Relationship Provenance & Proposal** as the shared evidence and supervised-proposal layer for Relationship creation/change.
