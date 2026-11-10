---
id: FOC-BLK-011
status: active
kind: component
authority: current
system: SYS-06
family: blocks
storybook: component
depends_on:
- OBJ-EVT
- FOC-011
- DS-FOC
platforms:
- web
---

# FOC-BLK-011 — Event History Block

Parent: [[SYS-06 — Focus & Shared Focus Blocks]]

## Purpose

Shows meaningful Events involving the focused object as an editorial story history rather than an audit log.

## Anatomy

Each Event entry may include:
- story position/date/session;
- Event title;
- concise consequence/change;
- related Thread;
- relevant participants;
- Source/provenance cue where important.

Entries can be grouped or spaced to communicate story rhythm without becoming a dense activity feed.

## Behaviour

Selecting an Event can:
- open Event Focus;
- open Chronicle at that story position;
- project the currently focused object as-of that Event.

History should emphasize canonically/story-significant Events rather than every edit.

## Appearance & behaviour

Editorial chronological sequence.

Avoid generic timeline-widget aesthetics where they overwhelm narrative readability.

## Relationships

- [[OBJ-EVT — Event Representation Family]] — underlying Event identity.
- Chronicle system — temporal deepening.
- [[FOC-011 — Focus Temporal Context]] — as-of object projection.

## Handoff

Build **FOC-BLK-011 — Event History Block** as the meaningful chronological story history for a focused World Object.
