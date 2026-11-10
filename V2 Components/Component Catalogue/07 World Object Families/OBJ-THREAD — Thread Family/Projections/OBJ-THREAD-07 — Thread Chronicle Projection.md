---
id: OBJ-THREAD-07
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

# OBJ-THREAD-07 — Thread Chronicle Projection

Parent: [[OBJ-THREAD — Thread Representation Family]]

## Purpose

Chronicle is one of Thread's primary contexts.

The dedicated Thread Chronicle Projection should show the Thread as a current passing through Events.

It can communicate:
- status over time;
- pressure changes;
- key Event intersections;
- involved object changes;
- resolution/dormancy.

Chronicle must avoid treating Thread as a simple start/end task bar.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Thread content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
