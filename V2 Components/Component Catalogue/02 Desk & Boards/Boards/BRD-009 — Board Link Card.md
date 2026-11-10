---
id: BRD-009
status: active
kind: component
authority: current
system: SYS-02
family: boards
storybook: component
depends_on:
- BRD-002
- BRD-005
- BRD-011
- DS-CAN
platforms:
- web
---

# BRD-009 — Board Link Card

Parent: [[DSK-009 — Composition Tool Menu]]

## Purpose

Places a navigational reference to another Board directly inside the current composition.

It allows large worlds to form spatial pathways between remembered working contexts without making Boards own or embed one another.

## Context & placement

Created from Compose by selecting a target Board and placing the resulting link card on the current Board.

It behaves as a Board composition object, not as a World Object.

## Anatomy

- target Board name;
- miniature Board preview;
- optional one-line Board description/context if available;
- subtle navigation affordance.

The preview can reuse [[BRD-002 — Board Preview Tile]] visual logic at Canvas-card scale.

## Appearance & behaviour

Should read immediately as a doorway/link to another workspace rather than a canonical location/entity card.

Single selection allows normal Board composition movement.

Explicit open/double-click navigates to the target Board using Board Open & Restore.

Returning through browser/back or recent context should preserve the source Board/view.

## States & variants

- normal;
- selected;
- target Board unavailable/deleted;
- preview loading.

## Relationships

- [[BRD-002 — Board Preview Tile]] — shared preview language.
- [[BRD-005 — Board Open & Restore]] — navigation behavior.
- [[BRD-011 — Board Preview Renderer]] — preview generation.
- [[DSK-009 — Composition Tool Menu]] — creation entry.

## Data / utility relationship

Stores only a Board-to-Board navigational reference and Placement geometry. It does not create a semantic World relationship.

## Handoff

Build **BRD-009 — Board Link Card** as the spatial navigational doorway to another remembered Board composition.
