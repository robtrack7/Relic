---
id: STG-006
status: active
kind: component
authority: current
system: SYS-11
family: workspace-live-tools
storybook: component
depends_on:
- OBJ-FRAG
- OBJ-FRAG-01
- STG-007
platforms:
- web
---

# STG-006 — Session Capture & Marking

Parent: [[STG-002 — Stage Carriage]]

## Purpose

Provides low-friction live capture without forcing classification and adds recording bookmarks for moments the GM wants post-session processing to inspect closely.

## Quick Capture

Quick Capture creates a [[OBJ-FRAG — Fragment Representation Family]] Fragment.

Minimum valid input can be one line.

Capture first; classify later.

## Capture context

A captured Fragment may retain:
- Session;
- elapsed Session time;
- current Scene;
- selected World Objects / Session Instances;
- recording offset when active;
- GM author/origin.

These are capture-context references, not automatically asserted Semantic Relationships.

## Marked Moment

Mark Moment is a recording bookmark rather than a World Object.

Store:
- recording segment + offset;
- Session elapsed time;
- current Scene;
- selected live context;
- optional short label.

Mark is available only while recording.

## No Quick Stub

Do not build a separate Quick Stub system.

If the GM is unsure what something is, capture a Fragment.

If the GM knows what they need, use ordinary Create or Librarian creation.

Session-only runnable people/creatures/hazards use [[STG-010 — Session Instance Model]].

## Relationships

- [[OBJ-FRAG-01 — Resolve Fragment]]
- [[STG-007 — Recording & Consent]]
- [[STG-014 — Stage Librarian Context Bridge]]
- Review & Settlement

## Handoff

Build **STG-006 — Session Capture & Marking** as Fragment-first live capture plus precise recording bookmarks.
