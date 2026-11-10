---
id: OBJ-011
status: active
kind: component
authority: current
system: SYS-03
family: shared-projection-components
storybook: component
depends_on:
- OBJ-009
- OBJ-015
- DS-OBJ
platforms:
- web
---

# OBJ-011 — Object Peek

Parent: [[OBJ-001 — World Object Representation Framework]]

## Purpose

Lets the GM recognize a referenced World Object without abandoning the current reading, conversation, or working context.

## Context & placement

Transient anchored preview opened from Inline Object References and other compact reference contexts.

Mounted through the shared overlay layer and positioned near the invoking reference without resizing the current surface.

## Anatomy

Keep deliberately compact:

- image when available;
- name;
- family/role;
- one concise context-sensitive summary;
- open/Focus action.

Historical invocation can include [[OBJ-009 — Historical & As-Of Indicator]].

## Appearance & behaviour

Should feel like editorial marginalia or a footnote card rather than a miniature Expanded Card.

It opens quickly, preserves the user's reading position, and dismisses cleanly.

Do not include long notes, full stat blocks, complete relationship lists, or a dense action menu.

## States & variants

- image/no image;
- historical;
- archived;
- unavailable;
- loading.

## Relationships

- [[OBJ-010 — Inline Object Reference]] — common invocation.
- [[OBJ-015 — Object Reference Navigation]] — deeper open action.
- family projections — supply family-specific one-line summary content where required.

## Handoff

Build **OBJ-011 — Object Peek** as the compact transient recognition preview for referenced World Objects.
