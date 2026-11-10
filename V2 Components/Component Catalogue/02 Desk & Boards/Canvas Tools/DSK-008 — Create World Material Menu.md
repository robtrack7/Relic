---
id: DSK-008
status: active
kind: component
authority: current
system: SYS-02
family: canvas-tools
storybook: component
depends_on:
- DSK-010
- DSK-009
- DS-CAN
platforms:
- web
---

# DSK-008 — Create World Material Menu

Parent: [[DSK-007 — Canvas Tool Cluster]]

## Purpose

Creates material that belongs to the persistent fictional world rather than only to the current Board composition.

Fragment is deliberately the easiest path so the GM never has to classify an idea before capturing it.

## Context & placement

Anchored above the bottom Create tool and mounted as a transient popover.

New spatial objects appear near the current cursor or a sensible open region of the visible Canvas.

## Anatomy

Primary creation:
- Fragment;
- Character;
- Place;
- Faction;
- Thread.

Additional persistent types may include:
- Event;
- Source / media;
- Artifact or other supported World Object families as the domain registry is finalized.

Fragment should be visually first and fastest.

## Appearance & behaviour

Compact and recognition-first.

Entity types may use simple icons plus labels, but the menu should not resemble a complex database "new record" chooser.

Selecting a type creates its smallest useful new representation directly on the Board and begins the minimum necessary edit flow.

No modal is required for normal creation.

## States & variants

- open;
- type search/filter only if the type list becomes genuinely large;
- unavailable type if current scope forbids creation.

## Relationships

- [[DSK-010 — Blank Canvas Quick Capture]] — bypasses this menu to create a Fragment.
- World Object representation families — supply newly created card/marker components.
- [[DSK-009 — Composition Tool Menu]] — separate Board-only creation path.

## Data / utility relationship

Invokes creation of persistent World Object identity in the current authorized Saga/World scope and creates an initial Board Placement where appropriate.

## Handoff

Build **DSK-008 — Create World Material Menu** as the compact persistent-world creation menu with Fragment as the fastest/default starting point.
