---
id: DSK-016
status: active
kind: component
authority: current
system: SYS-02
family: selection-placement
storybook: component
depends_on:
- DSK-017
- DSK-023
- DSK-024
- DS-CAN
platforms:
- web
---

# DSK-016 — Selection Toolbar

Parent: [[DSK-002 — Canvas Viewport]]

## Purpose

Provides the high-value actions relevant to the current Canvas selection without permanently occupying viewport chrome.

## Context & placement

Floats near the selected content in screen space, choosing a top/bottom/side position that remains visible within the current usable viewport and avoids docked carriages.

It follows the screen-space bounds of the selection rather than becoming Board content.

## Anatomy

**Single World Object**
Likely:
- Focus;
- next disclosure / expand where supported;
- semantic Connect;
- one high-value type-specific action if truly useful;
- More.

**Multi-selection**
Likely:
- Connect;
- Arrange;
- Section around selection;
- Move/Copy to Board;
- More.

**Composition object**
Uses composition-specific actions rather than World Object actions.

## Appearance & behaviour

Compact, contextual, and visually attached to the selection.

Do not expose every action as an icon. High-frequency actions can be direct; the rest belong under More or the context menu.

The toolbar disappears when selection clears or interaction would make it obstructive during drag/resize.

## States & variants

- single World Object;
- multi-selection;
- Section;
- annotation;
- decorative edge;
- Board Link;
- hidden during manipulation.

## Relationships

- [[DSK-017 — Canvas Selection Model]] — determines selection.
- [[DSK-023 — Multi-Selection Arrange Menu]] — secondary multi-selection actions.
- [[DSK-024 — Placement Context Menu]] — deeper action set.
- [[DSK-027 — Focus Invocation]] — Focus action.

## Handoff

Build **DSK-016 — Selection Toolbar** as the context-aware floating action strip for single, multi, and composition-object selections.
