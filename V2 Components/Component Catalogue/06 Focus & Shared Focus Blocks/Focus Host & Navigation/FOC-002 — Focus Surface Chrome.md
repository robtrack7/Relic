---
id: FOC-002
status: active
kind: component
authority: current
system: SYS-06
family: focus-host-navigation
storybook: component
depends_on:
- FOC-003
- FOC-006
- OBJ-013
- DS-FOC
platforms:
- web
---

# FOC-002 — Focus Surface Chrome

Parent: [[FOC-001 — Focus Host]]

## Purpose

Provides the minimal screen-space controls required to operate a Focus surface without wrapping the focused object in a conventional application-page header.

## Context & placement

Lives at the edge/top margin of the Focus working region in screen space.

It must remain visually subordinate to the family-specific object identity and Focus content.

It should not duplicate global shell controls such as Search, Librarian, Profile, or Current Context.

## Anatomy

Initial controls:
- Close / Return;
- More / object actions when needed;
- optional section-navigation entry on narrow layouts;
- optional history/as-of entry where that family supports temporal inspection.

The object's own name/image/type are normally part of the family Focus composition, not this chrome.

## Appearance & behaviour

Very low chrome.

Controls may float against the Focus margin rather than sit inside a bar.

Close/Return should communicate the originating context where useful, especially when Focus was entered from Stage or Chronicle.

More actions are supplied through the hosting object-family action contract rather than hard-coded here.

## States & variants

- normal;
- narrow layout;
- historical context available;
- More menu open;
- archived/unavailable.

## Relationships

- [[FOC-003 — Focus Return Context]] — Close/Return behavior.
- [[FOC-006 — Focus Section Navigator]] — narrow navigation entry.
- [[OBJ-013 — Object Action Contribution Contract]] — object-level actions.
- [[OBJ-009 — Historical & As-Of Indicator]] — temporal context cue.

## Handoff

Build **FOC-002 — Focus Surface Chrome** as the minimal return/action/navigation controls around a family-specific Focus composition.
