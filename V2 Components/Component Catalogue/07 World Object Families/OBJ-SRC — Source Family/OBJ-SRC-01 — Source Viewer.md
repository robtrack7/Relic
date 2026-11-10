---
id: OBJ-SRC-01
status: active
kind: surface
authority: current
system: SYS-07
family: source
storybook: scene
depends_on:
- FOC-001
- MEC-015
- DS-OBJ
platforms:
- web
---

# OBJ-SRC-01 — Source Viewer

Parent: [[OBJ-SRC — Source Representation Family]]

## Purpose

Provides the deep inspection workspace for Source content without forcing PDFs, webpages, transcripts, images, and notes into ordinary World Object Focus blocks.

## Context & placement

Opens in [[FOC-001 — Focus Host]] or an equivalent central deep-reading state while preserving Desk/Stage/Librarian context.

The Source identity remains persistent and linkable.

## Supported source modes

Initial modes may include:
- PDF;
- webpage/link;
- transcript/text;
- Markdown/plain text;
- image/handout;
- imported document.

Each mode uses the minimum appropriate controls rather than one huge universal toolbar.

## PDF behaviour

Support:
- page navigation;
- zoom/fit;
- page thumbnails or compact page navigator where useful;
- search within extracted text;
- deep links to page/position;
- selection/excerpt capture;
- Source provenance/metadata;
- Librarian context tied to current page/selection.

Do not rebuild a full Acrobat-class editor.

## Web behaviour

For web Sources:
- show title/origin;
- safe preview or extracted readable content where available;
- original-page open action;
- indexed text search where supported;
- captured excerpt/anchor;
- Librarian context.

Relic should not assume arbitrary websites can always be embedded.

## Text / transcript behaviour

Support:
- readable text;
- search;
- anchored excerpts;
- source timestamps/segments where available;
- linked World Objects;
- capture/quote into relevant Relic material.

Speaker diarization remains outside current V2 scope unless the product scope changes.

## Image / handout behaviour

Support:
- fit/zoom;
- caption/metadata;
- provenance;
- linked World Objects;
- optional pinned reference use.

## Librarian integration

The Librarian receives:
- Source identity;
- current page/section;
- selected excerpt;
- authorized linked objects.

This enables questions such as:
- `What does this rule say about reactions?`
- `Where is Mara mentioned in this PDF?`
- `Summarize pages 42–47.`

Generated answers remain Librarian output unless captured.

## Rules reference integration

[[MEC-015 — Rules Reference Binding]] can deep-link directly into Source Viewer at:
- PDF page;
- text anchor;
- web URL/anchor;
- selected excerpt.

The Viewer is therefore the deep-reading endpoint for user-provided rules material.

## Responsive behaviour

On wide layouts, Source Viewer may use a document navigator plus reading pane.

On narrower layouts, navigators collapse and the document remains primary.

During Stage, preserve Stage Carriage where useful and allow quick return to the same session context.

## Handoff

Build **OBJ-SRC-01 — Source Viewer** as the deep PDF/web/text/image source inspection surface with search, anchored reference, and Librarian context.
