---
id: REV-008
status: active
kind: component
authority: current
system: SYS-12
family: workspace-review-ui
storybook: component
depends_on:
- STG-006
- REV-010
- REV-013
- DS-TRUST
platforms:
- web
---

# REV-008 — Evidence & Transcript Inspector

Parent: [[REV-002 — Session Settlement Workspace]]

## Purpose

Makes AI interpretation auditable through direct evidence while allowing transcript correction without erasing provenance.

## Evidence types

May include:
- transcript excerpt;
- audio timestamp;
- Stage Fragment;
- Marked Moment;
- closing note;
- existing World Object;
- Source document;
- previous Event.

## Transcript

Show:
- timestamp/segment;
- captured excerpt used when proposal was created;
- current corrected transcript;
- audio playback where retained/available;
- evidence/source state.

## Transcript correction

Allow text correction.

Preserve immutable:
- segment identity;
- timestamps/boundaries.

If a correction materially changes evidence relied on by a pending Story Change, mark citation drift/source changed.

Do not automatically rewrite the proposal behind the GM's back.

## Broken evidence

If a pending settlement materially depends on evidence that is missing/invalid, blind settlement is disabled for that mutation.

The GM can:
- reject;
- provide/edit GM-authored change;
- attach alternative evidence;
- regenerate/reinterpret.

## Relationships

- [[STG-006 — Session Capture & Marking]]
- [[REV-010 — Exceptions, Conflicts & Protected Changes]]
- [[REV-013 — Settlement Librarian Context Bridge]]

## Handoff

Build **REV-008 — Evidence & Transcript Inspector** as the precise evidence/audit surface behind effortless high-level settlement.
