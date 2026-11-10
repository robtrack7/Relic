---
id: FOC-BLK-015
status: active
kind: component
authority: current
system: SYS-06
family: blocks
storybook: component
depends_on:
- OBJ-FRAG
- FOC-008
- DS-FOC
platforms:
- web
---

# FOC-BLK-015 — GM Notes Block

Parent: [[SYS-06 — Focus & Shared Focus Blocks]]

## Purpose

Provides a private, low-friction GM working area attached to the focused World Object.

## Use

Appropriate content:
- secrets;
- future ideas;
- improvisation;
- unresolved thoughts;
- hidden motives;
- table reminders;
- shorthand;
- questions to revisit.

## Appearance & behaviour

Looser than settled Narrative.

The visual language may feel slightly more handwritten/notebook-like while still using the Relic design system.

Supports direct text editing and Inline Object References.

The block should be usable even when notes are fragmentary.

## Boundaries

GM-only visibility must be enforced at the database/data-access layer.

The block itself must never be the security boundary.

Substantial unresolved material can be converted to a Fragment where the GM wants it to become an independently trackable object.

## Relationships

- [[OBJ-FRAG — Fragment Representation Family]] — optional conversion destination.
- [[FOC-008 — Focus Inline Editing]] — direct editing.
- permission/RLS system — actual GM-only enforcement.

## Player privacy boundary

GM Notes are structurally GM-only.

Future player publication must deny this block through authorization/data access; do not rely on hiding it in the player UI.

## Handoff

Build **FOC-BLK-015 — GM Notes Block** as the private, loose, directly editable working-notes section for Focus.
