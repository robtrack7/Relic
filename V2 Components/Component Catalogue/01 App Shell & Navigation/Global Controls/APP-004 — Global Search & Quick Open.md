---
id: APP-004
status: active
kind: component
authority: current
system: SYS-01
family: global-controls
storybook: component
depends_on:
- APP-005
- APP-011
- SRH-002
- DS-FRM-SEARCH
platforms:
- web
---

# APP-004 — Global Search & Quick Open

Parent: [[APP-001 — Global App Shell]]

## Purpose

Global Search is Relic's persistent retrieval and quick-navigation entry.

Spatial organization must never become a requirement for remembering where something lives. Search gives the GM a reliable way to find any authorized world material from anywhere in the application.

## Context & placement

Lives in the upper working frame near [[APP-005 — Current Context Control]].

Floats in screen space rather than reserving a conventional header row.

The field remains available across Desk, Library, Sessions, Prepare, Stage, and Focus.

Search Results themselves are owned by the Search system and mounted through [[APP-011 — Global Overlay Host]].

## Use

The GM can:

- click into the field;
- use the global Search shortcut;
- search Characters, Places, Factions, Threads, Events, Boards, Sessions, Sources, and other indexed material;
- open a result;
- jump to its relevant spatial or Focus context;
- revisit recent items when the field is empty.

During Stage, the same global Search remains in place but the Search system may rank session-relevant material more highly.

Stage does not get a second competing Search bar.

## Anatomy

At rest:

- Search icon;
- compact placeholder;
- optional shortcut hint.

Focused:

- active query field;
- clear control when populated;
- optional scope/context indication only when useful.

Do not expose filter controls permanently.

## Appearance & behaviour

At rest it should be visually restrained.

Focus may expand the field horizontally and increase its prominence.

Typing opens the Search Results surface beneath/around it without resizing the working viewport.

Search should feel immediate and keyboard-native.

Command-style actions may eventually be supported through the same entry point where natural, but this ticket does not create a separate generic command language.

## States & variants

- resting;
- focused/empty;
- query entered;
- results open;
- no results;
- searching;
- degraded/offline search capability.

## Relationships

- [[APP-001 — Global App Shell]] — owns persistent placement.
- [[APP-011 — Global Overlay Host]] — mounts Search Results.
- [[SRH-002 — Quick Search Results]] — owns result presentation.
- [[APP-005 — Current Context Control]] — neighbouring orientation control.
- [[STG-001 — Stage Workspace State]] — may influence result ranking/context without relocating Search.

## Data / utility relationship

Invokes the Search system within the user's current authorized Saga/World scope.

The component owns query entry, not indexing or ranking.

## Handoff

Build **APP-004 — Global Search & Quick Open** as Relic's persistent shell-level Search entry; result logic and presentation remain Search-system components.
