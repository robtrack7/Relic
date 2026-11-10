---
id: SRH-003
status: active
kind: surface
authority: current
system: SYS-09
family: search
storybook: scene
depends_on:
- SRH-004
- SRH-001
- SRH-005
platforms:
- web
---

# SRH-003 — Full Search Surface

Parent: [[SYS-09 — Search & Library]]

## Purpose

Provides deeper inspection of broad searches when Quick Search is insufficient.

It remains a retrieval surface, not an AI answer surface.

## Entry points

Open from:
- `See all results`;
- a broad query action;
- future direct Search navigation if useful.

## Major regions

**Header**
- query;
- result count;
- scope/filter controls.

**Results**
- one primary ranked stream;
- contextual result grouping only when useful.

**Filters**
- lightweight type/scope controls;
- no permanent database-admin facet wall.

## Result types

Examples:

**Identity**
Character, Place, Faction, Artifact, Thread, Event, Fragment.

**Source**
PDF, webpage, transcript, note/document, image.

**Navigation**
Board, Session.

Content matches can show [[SRH-004 — Search Result Match Context]].

## Deep navigation

Selecting a result should open the closest addressable target.

Examples:
- World Object → Card/Focus as appropriate;
- Character content match → relevant Focus block;
- PDF match → exact page in Source Viewer;
- transcript match → exact segment/anchor;
- Board → open/restore Board;
- Session → open Session context.

## Librarian handoff

The Full Search Surface may allow an explicit selected result/source set to become context for the Librarian's **retrieval/question-answering path**.

This does not add an `Ask AI` button to every result and does not define Librarian world-management behavior.

Opening/selecting material and then using the Librarian carriage is the preferred interaction.

## Responsive behaviour

Wide layouts can reserve modest room for filters.

Narrow layouts move filters into a compact control and keep results primary.

## Relationships

- [[SRH-001 — Search System]]
- [[SRH-004 — Search Result Match Context]]
- [[SRH-005 — Search Scope & Filters]]
- [[FOC-010 — Focus Anchor & Deep Link]]
- [[OBJ-SRC-01 — Source Viewer]]

## Handoff

Build **SRH-003 — Full Search Surface** as the deeper ranked retrieval surface with direct deep-link navigation and optional context selection for Librarian retrieval/Q&A.
