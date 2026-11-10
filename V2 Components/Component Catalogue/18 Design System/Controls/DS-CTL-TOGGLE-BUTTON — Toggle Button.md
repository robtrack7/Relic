---
id: DS-CTL-TOGGLE-BUTTON
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
platforms:
- web
---

# DS-CTL-TOGGLE-BUTTON — Toggle Button

## Purpose

A pressable control with a persistent on/off or selected/unselected state, used when the action itself also represents the current state.

## Rules

- selected state must remain visible without hover;
- expose proper pressed/selected semantics to assistive technology;
- do not use a Toggle Button for a one-shot action; use Button/Icon Button instead;
- do not use it for mutually exclusive multi-option selection when Segmented Control/Radio communicates the model more clearly.

## Storybook / manual test

Off/on, hover, focus-visible, pressed, disabled, compact toolbar use, icon+label and icon-only via the appropriate wrapper. Check selected state against proposal/live/Canvas backgrounds.
