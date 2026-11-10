---
id: DS-CTL-BUTTON
status: active
kind: component
authority: current
system: SYS-18
family: ds-ctl
storybook: component
depends_on:
- DS-FND-TYPE
- DS-FND-COLOR
- DS-FND-STATE
- DS-FND-DENSITY
platforms:
- web
---

# DS-CTL-BUTTON — Button

## Purpose

The standard labeled action control. Feature components decide what the action means; this component owns consistent hierarchy, density, interaction state and accessibility.

## Anatomy

- text label;
- optional leading or trailing icon;
- optional loading treatment without unexpected layout shift.

Icon-only actions use [[DS-CTL-ICON-BUTTON — Icon Button]]. Stateful pressed/unpressed controls use [[DS-CTL-TOGGLE-BUTTON — Toggle Button]].

## Variants

- primary;
- secondary;
- quiet;
- destructive.

Variants describe semantic priority, never literal colour names. Support normal and compact density where the host requires it.

## Storybook / manual test

Cover every variant at default, hover, focus-visible, pressed, disabled and loading states; leading/trailing icon; long label; compact density; and adjacent button groups. Verify visible keyboard focus and restrained destructive emphasis.

## Implementation flexibility

Preserve semantic button behavior unless the interaction genuinely is navigation.
