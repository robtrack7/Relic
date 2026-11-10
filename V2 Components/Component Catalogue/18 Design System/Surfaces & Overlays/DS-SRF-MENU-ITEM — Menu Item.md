---
id: DS-SRF-MENU-ITEM
status: active
kind: component
authority: current
system: SYS-18
family: ds-srf
storybook: component
depends_on:
- DS-FND-TYPE
- DS-FND-ICON
- DS-FND-STATE
- DS-SRF-MENU
platforms:
- web
---

# DS-SRF-MENU-ITEM — Menu Item

## Purpose

One actionable row inside a Menu or Context Menu. The host owns grouping, dismissal and positioning; the item owns action readability and pointer/keyboard state.

## Anatomy

- label;
- optional leading icon or selected/check cue;
- optional trailing shortcut/context text;
- optional destructive semantics.

## Storybook / manual test

Default, hover, focus-visible, disabled, selected/check state, destructive item, shortcut text, long label, icon/no-icon and grouped-menu examples. Test arrow-key/Enter behavior in the Menu story rather than duplicating host navigation logic here.
