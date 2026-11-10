---
id: DS-FRM-INLINE
status: active
kind: component
authority: current
system: SYS-18
family: ds-frm
storybook: component
depends_on:
- DS-FND-TYPE
- DS-FND-COLOR
- DS-FND-STATE
platforms:
- web
---

# DS-FRM-INLINE — Inline Editable Text

## Purpose

Defines the shared Inline Editable Text interaction used wherever Relic needs this form/input pattern.

## Design rules

Prefer conventional understandable input behavior. Validation/help text belongs to the field system; domain rules remain with the consuming feature.

Use a local draft while editing. Done or Enter commits a single-line value; Escape or Cancel restores the prior value. Outside blur/pointer commits once. Shortcuts remain isolated from Canvas controls.

## Storybook / manual test

Empty/value, focus, disabled, error/validation, long-content, keyboard operation, and any selection/open state that applies.

Use realistic Relic copy rather than lorem ipsum. The story is a design/test fixture, not a substitute for the owning product contract.

## Implementation flexibility

Exact DOM/CSS/component composition may change as long as the approved visual and interaction contract remains coherent.
