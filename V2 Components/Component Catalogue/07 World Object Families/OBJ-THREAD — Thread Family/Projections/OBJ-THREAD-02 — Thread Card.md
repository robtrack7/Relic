---
id: OBJ-THREAD-02
status: active
kind: component
authority: current
system: SYS-07
family: thread
storybook: component
depends_on:
- WOF-001
- OBJ-002
- OBJ-015
platforms:
- web
---

# OBJ-THREAD-02 — Thread Card

Parent: [[OBJ-THREAD — Thread Representation Family]]

## Purpose

The normal Thread Card answers:

> What is unresolved here?

Suggested anatomy:
- Thread name or central question;
- current pressure;
- status;
- a few key involved World Object references;
- optional recent Event cue.

Example:

**Who killed the Harbormaster?**  
*Escalating*  
Mara · Gilded Harbour · Lantern Society

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Thread content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
