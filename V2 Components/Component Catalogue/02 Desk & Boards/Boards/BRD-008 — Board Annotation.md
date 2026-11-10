---
id: BRD-008
status: active
kind: component
authority: current
system: SYS-02
family: boards
storybook: component
depends_on:
- DSK-015
- DS-CAN
platforms:
- web
---

# BRD-008 — Board Annotation

Parent: [[DSK-009 — Composition Tool Menu]]

## Purpose

Adds lightweight text directly to the Board for headings, labels, arrows/diagram notes, and spatial commentary that should not become persistent world knowledge.

## Context & placement

Lives in Canvas coordinates as Board-only composition.

Can be created from Compose or the blank Canvas context menu.

## Anatomy

Initial presentation variants:
- Heading;
- Label;
- Note/caption.

Keep formatting deliberately limited:
- text content;
- small hierarchy/style choice;
- optional text alignment;
- restrained emphasis.

No full rich-text document editor.

## Appearance & behaviour

Visually lighter and more typographic than Fragment cards.

Direct click/double-click enters text editing.

Annotations can resize to affect wrapping without implying World Object disclosure.

A contextual action should allow converting meaningful annotation text into a Fragment if the GM decides it belongs in the world.

## States & variants

- heading;
- label;
- note;
- editing;
- selected.

## Relationships

- [[DSK-009 — Composition Tool Menu]] — creation.
- Fragment family — conversion destination when text becomes world material.
- [[DSK-015 — Decorative Connector Edge]] — can visually point to/from annotations through free/anchor endpoints where supported.

## Data / utility relationship

Stored exclusively as Board composition unless explicitly converted to a persistent World Object.

## Handoff

Build **BRD-008 — Board Annotation** as lightweight editable Board typography with heading/label/note variants and explicit conversion to Fragment.
