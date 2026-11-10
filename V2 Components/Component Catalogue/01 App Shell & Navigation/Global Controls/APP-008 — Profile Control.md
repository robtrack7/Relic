---
id: APP-008
status: active
kind: component
authority: current
system: SYS-01
family: global-controls
storybook: component
depends_on:
- APP-009
- APP-007
platforms:
- web
---

# APP-008 — Profile Control

Parent: [[APP-001 — Global App Shell]]

## Purpose

Profile Control is the terminal top-right account entry point.

It provides access to account/settings functions while keeping those low-frequency tasks out of the creative workspace.

## Context & placement

Floats in the extreme top-right.

It follows Librarian Toggle.

It does not resize the active surface.

## Use

Selecting it opens [[APP-009 — Profile Menu]].

The control is not intended to communicate a large amount of account status.

## Anatomy

Prefer:

- avatar when available;
- otherwise initials or a restrained personal mark.

Avoid adding the user's full name permanently to the shell.

## Appearance & behaviour

Small, quiet, and clearly interactive.

It should not compete visually with Relic or Librarian.

The control may use a circular or similarly compact portrait treatment if appropriate, but it should still belong to the editorial Relic language rather than generic SaaS account chrome.

## States & variants

- resting;
- hover/focus;
- menu open;
- image;
- initials fallback.

## Relationships

- [[APP-009 — Profile Menu]] — opened by this control.
- [[APP-007 — Librarian Toggle]] — immediate neighbour.
- [[APP-001 — Global App Shell]] — owns placement.

## Handoff

Build **APP-008 — Profile Control** as the restrained terminal top-right entry point for account/settings navigation.
