---
id: DS-FRM-RESOURCE
status: active
kind: behavior
authority: current
system: SYS-18
family: ds-frm
storybook: pattern
depends_on:
- DS-FND-TYPE
- DS-FND-COLOR
- DS-FND-STATE
platforms:
- web
---

# DS-FRM-RESOURCE — Search-Backed Resource Picker

## Purpose

Defines the shared Search-Backed Resource Picker interaction used wherever Relic needs this form/input pattern.

## Design rules

Prefer conventional understandable input behavior. Validation/help text belongs to the field system; domain rules remain with the consuming feature.

## Storybook / manual test

Empty/value, focus, disabled, error/validation, long-content, keyboard operation, and any selection/open state that applies.

Use realistic Relic copy rather than lorem ipsum. The story is a design/test fixture, not a substitute for the owning product contract.

## Implementation flexibility

Exact DOM/CSS/component composition may change as long as the approved visual and interaction contract remains coherent.
