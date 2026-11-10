---
id: DS-CTL-ICON-BUTTON
status: active
kind: component
authority: current
system: SYS-18
family: ds-ctl
storybook: component
depends_on:
- DS-FND-ICON
- DS-FND-STATE
- DS-FND-DENSITY
- DS-SRF-TOOLTIP
platforms:
- web
---

# DS-CTL-ICON-BUTTON — Icon Button

## Purpose

Compact icon-only action control for toolbars, Canvas chrome and object actions where the symbol is genuinely recognizable.

## Rules

- always provide an accessible name;
- provide a tooltip where meaning is not immediately obvious;
- keep a usable hit target even when the visible glyph is small;
- selected/toggle semantics belong to [[DS-CTL-TOGGLE-BUTTON — Toggle Button]];
- prefer a short labeled action when an icon alone would be ambiguous.

## Storybook / manual test

Default, hover, focus-visible, pressed, disabled, normal/compact visual density, several icon shapes, tooltip relationship, and a row of adjacent icon buttons.
