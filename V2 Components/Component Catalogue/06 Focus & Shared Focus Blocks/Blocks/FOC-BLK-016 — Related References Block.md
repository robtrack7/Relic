---
id: FOC-BLK-016
status: prototype
kind: component
authority: current
system: SYS-06
family: blocks
storybook: component
depends_on:
- FOC-BLK-014
- DSK-033
- MEC-015
- DS-FOC
platforms:
- web
---

# FOC-BLK-016 — Related References Block

Parent: [[SYS-06 — Focus & Shared Focus Blocks]]

## Purpose

Collects useful reference material attached to a focused World Object when that material is neither a semantic Relationship nor primarily evidence/provenance.

This ticket remains prototype because later Source/Library work may show that these references belong cleanly inside Sources & Provenance instead.

## Use

Possible examples:
- rules reference relevant to an Artifact/ability;
- handout;
- external webpage;
- campaign document;
- GM reference sheet;
- pinned procedural note.

## Anatomy

Each reference can show:
- title;
- source/reference type;
- optional page/anchor;
- optional short note explaining why it is attached.

Reference identity should reuse Source/Rules Reference systems where possible rather than inventing a third document model.

## Appearance & behaviour

Compact reference shelf/list.

Open the target directly in Source Peek/viewer, browser, PDF page, or Rules Reference context.

Do not duplicate provenance information merely because the same Source is attached here for convenience.

## Relationships

- [[FOC-BLK-014 — Sources & Provenance Block]] — possible future merge target.
- [[DSK-033 — Pinned Reference Shelf]] — workspace-level pinned references.
- [[MEC-015 — Rules Reference Binding]] — mechanics rules deep links.
- [[OBJ-SRC — Source Representation Family]] — underlying references.

## Handoff

Build **FOC-BLK-016 — Related References Block** as a prototype convenience-reference section while keeping the implementation mergeable with Sources & Provenance.
