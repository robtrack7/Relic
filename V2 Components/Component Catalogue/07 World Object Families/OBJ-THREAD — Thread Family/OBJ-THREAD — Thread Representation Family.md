---
id: OBJ-THREAD
status: active
kind: family
authority: current
system: SYS-07
family: thread
storybook: none
---

# OBJ-THREAD — Thread Representation Family

Parent: [[SYS-07 — World Object Families]]

## Purpose

Defines the UI family for persistent narrative currents: mysteries, threats, promises, quests, conflicts, character arcs, unresolved questions, consequences, and other dramatic pressures that persist across Events and Sessions.

## Family emphasis

Thread is structurally different from ordinary nouns in the world.

Its representations prioritize:
- the unresolved question or pressure;
- stakes;
- current status;
- involved World Objects;
- recent progression;
- possible direction/consequence;
- temporal history.

A Thread should never look like a generic project-management task.

## Projections

- [[OBJ-THREAD-02 — Thread Card]]
- [[OBJ-THREAD-03 — Thread Expanded Card]]
- [[OBJ-THREAD-04 — Thread Focus]]
- [[OBJ-THREAD-05 — Thread Index Projection]]
- [[OBJ-THREAD-06 — Thread Prepare Projection]]
- [[OBJ-THREAD-07 — Thread Chronicle Projection]]

## Actions

Possible actions:
- Focus;
- change Thread status;
- add involved World Object/Relationship;
- add Event/development;
- add to Session;
- resolve/dormant/reactivate;
- archive where appropriate.

Status changes can be temporal/story-significant.

## Shared states

Examples:
- dormant;
- active;
- escalating;
- resolved;
- uncertain/custom.

The domain should allow campaign-defined vocabulary without making arbitrary free text impossible to query.

## Implementation rule

These files are catalogue/retrieval boundaries, not a requirement that production code use one module per projection. Share implementation where it is genuinely simpler while preserving projection semantics.
