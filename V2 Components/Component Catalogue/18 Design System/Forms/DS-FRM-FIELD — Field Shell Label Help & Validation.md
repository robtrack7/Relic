---
id: DS-FRM-FIELD
status: active
kind: component
authority: current
system: SYS-18
family: ds-frm
storybook: component
depends_on:
- DS-FND-TYPE
- DS-FND-SPACING
- DS-FND-STATE
platforms:
- web
---

# DS-FRM-FIELD — Field Shell Label Help & Validation

## Purpose

Shared structural wrapper around an input when it needs a label, supporting text, validation or required/optional context. It does not own domain validation rules.

## Anatomy

- label;
- input slot;
- optional help/description;
- optional validation/error message;
- optional restrained required/optional cue when ambiguity matters.

## Rules

Labels remain persistent where losing context would hurt editing. Associate help/error text programmatically with the input and avoid disruptive layout jumps where practical.

## Storybook / manual test

Text Field, Select and Text Area examples; no-help/help/error states; long labels; long validation; disabled input; compact settings row; keyboard focus.
