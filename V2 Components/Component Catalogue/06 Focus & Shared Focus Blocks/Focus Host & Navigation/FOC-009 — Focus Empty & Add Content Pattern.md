---
id: FOC-009
status: active
kind: component
authority: current
system: SYS-06
family: focus-host-navigation
storybook: component
depends_on:
- FOC-008
- DS-FOC
platforms:
- web
---

# FOC-009 — Focus Empty & Add Content Pattern

Parent: [[FOC-007 — Focus Block Frame]]

## Purpose

Keeps sparse Focus surfaces elegant and actionable without filling them with database-like `No data` panels.

## Use

Important but empty blocks can show a quiet creation affordance.

Examples:
- `Relationships  + Add relationship`
- `Knowledge  + Add knowledge`
- `Images  + Add image`

Optional blocks whose absence carries no useful meaning can disappear completely.

## Appearance & behaviour

Use minimal text/action treatment.

No large empty-state illustrations.

No repeated explanatory paragraphs.

The add action should transition directly into the relevant inline creation interaction.

## States & variants

- block hidden when optional/empty;
- quiet empty block;
- add action;
- first item being created.

## Relationships

- [[FOC-007 — Focus Block Frame]] — common host.
- [[FOC-008 — Focus Inline Editing]] — creation/editing behavior.

## Handoff

Build **FOC-009 — Focus Empty & Add Content Pattern** as the minimal sparse-state convention for Focus Blocks.
