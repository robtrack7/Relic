---
id: FOC-BLK-010
status: active
kind: component
authority: current
system: SYS-06
family: blocks
storybook: component
depends_on:
- OBJ-THREAD
- FOC-BLK-011
- DS-FOC
platforms:
- web
---

# FOC-BLK-010 — Thread Membership Block

Parent: [[SYS-06 — Focus & Shared Focus Blocks]]

## Purpose

Shows the narrative Threads that currently or historically involve the focused World Object.

## Anatomy

Each Thread entry may show:
- Thread name;
- status;
- why the focused object matters;
- current pressure/question;
- recent relevant Event.

Only important Threads should dominate the view.

## Behaviour

Can:
- open Thread Focus;
- add/link a Thread where semantically appropriate;
- remove/resolve membership relationship;
- create a new Thread from context.

The block must not look like a task list.

## Temporal behaviour

Historical Focus can show Thread involvement/status appropriate to that story position where modeled.

## Relationships

- [[OBJ-THREAD — Thread Representation Family]] — underlying Thread identity.
- [[FOC-BLK-011 — Event History Block]] — recent Thread-intersecting Events.
- Chronicle system — deeper temporal inspection.

## Handoff

Build **FOC-BLK-010 — Thread Membership Block** as the narrative-current section connecting the focused object to active and historical Threads.
