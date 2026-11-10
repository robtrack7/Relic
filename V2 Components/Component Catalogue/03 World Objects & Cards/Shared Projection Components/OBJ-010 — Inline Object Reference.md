---
id: OBJ-010
status: active
kind: component
authority: current
system: SYS-03
family: shared-projection-components
storybook: component
depends_on:
- OBJ-011
- OBJ-015
- OBJ-005
- DS-OBJ
platforms:
- web
---

# OBJ-010 — Inline Object Reference

Parent: [[OBJ-001 — World Object Representation Framework]]

## Purpose

Represents a World Object naturally inside prose, lists, Librarian responses, Review material, Focus blocks, and other text-oriented interfaces.

## Context & placement

Lives inline with surrounding text or compact list content and must preserve normal reading flow rather than inserting a card into every reference.

## Anatomy

Base form:

- object display name;
- optional quiet type cue;
- optional tiny image only when it materially improves recognition.

Accessible text should provide enough disambiguation where duplicate fictional names would otherwise be confusing.

## Appearance & behaviour

More expressive than a generic hyperlink while remaining typographically integrated.

Hover/focus makes interactivity clear. A secondary hover/peek interaction may invoke [[OBJ-011 — Object Peek]], while primary activation follows [[OBJ-015 — Object Reference Navigation]].

## States & variants

- normal;
- hover/focus;
- archived;
- unavailable;
- historical/as-of companion context.

## Relationships

- [[OBJ-011 — Object Peek]] — transient recognition view.
- [[OBJ-015 — Object Reference Navigation]] — primary open/navigation behavior.
- [[OBJ-005 — Object Type Cue]] — optional family signal.

## Handoff

Build **OBJ-010 — Inline Object Reference** as the shared prose-friendly interactive reference to persistent World Object identity.
