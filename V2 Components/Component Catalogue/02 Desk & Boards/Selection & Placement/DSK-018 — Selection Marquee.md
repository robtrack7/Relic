---
id: DSK-018
status: active
kind: behavior
authority: current
system: SYS-02
family: selection-placement
storybook: pattern
depends_on:
- BRD-007
- DS-CAN
platforms:
- web
---

# DSK-018 — Selection Marquee

Parent: [[DSK-017 — Canvas Selection Model]]

## Purpose

Allows fast spatial selection of several Board objects by dragging across empty Canvas space.

## Interaction

Drag from blank Canvas to create a marquee rectangle.

Default selection should favor objects materially contained by the marquee rather than selecting every tiny intersection, reducing accidental captures.

A platform modifier may switch to intersection selection if useful.

Sections should not automatically select all of their contents merely because the Section boundary is touched; Section/content behavior must remain understandable.

## Appearance & behaviour

Use a very light translucent/outlined selection rectangle.

Objects preview their selected state as the marquee changes.

The marquee disappears immediately on release.

## Relationships

- [[DSK-017 — Canvas Selection Model]] — receives resulting selection.
- [[BRD-007 — Board Section]] — special containment interaction.

## Handoff

Implement **DSK-018 — Selection Marquee** as low-chrome drag selection over blank Canvas space with clear containment behavior.
