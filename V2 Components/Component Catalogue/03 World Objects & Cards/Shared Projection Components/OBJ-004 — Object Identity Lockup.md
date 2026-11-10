---
id: OBJ-004
status: active
kind: component
authority: current
system: SYS-03
family: shared-projection-components
storybook: component
depends_on:
- OBJ-005
- OBJ-006
- OBJ-012
- DS-OBJ
platforms:
- web
---

# OBJ-004 — Object Identity Lockup

Parent: [[OBJ-001 — World Object Representation Framework]]

## Purpose

Provides a reusable identity composition for projections that need a clear object header without forcing every World Object family into the same card template.

## Context & placement

Used selectively inside Cards, Focus surfaces, pickers, and contextual projections where a shared identity treatment improves recognition.

A family may integrate its identity directly into a bespoke layout instead of using this component unchanged.

## Anatomy

Potential elements:

- primary name;
- optional alias/honorific;
- optional quiet object-type cue;
- optional primary image/avatar;
- optional role, category, or identifying subtitle.

The name remains the dominant identity element.

## Appearance & behaviour

Typography-forward, compact, and editorial.

It must support both image-led and text-only representations without leaving empty placeholder structure.

Avoid generic profile-header styling. Editable contexts can delegate name editing to [[OBJ-012 — Inline Object Rename]].

## States & variants

- image + text;
- text only;
- alias present;
- compact;
- Focus-sized;
- historical/as-of companion treatment.

## Relationships

- [[OBJ-005 — Object Type Cue]] — optional family signal.
- [[OBJ-006 — Object Image & Media Lead]] — primary-image behavior.
- [[OBJ-009 — Historical & As-Of Indicator]] — temporal context near identity.
- [[OBJ-012 — Inline Object Rename]] — edit behavior.

## Handoff

Build **OBJ-004 — Object Identity Lockup** as a flexible shared identity composition, used only where it improves consistency without flattening family-specific design.
