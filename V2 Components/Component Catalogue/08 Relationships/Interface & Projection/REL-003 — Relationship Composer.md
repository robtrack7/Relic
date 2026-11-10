---
id: REL-003
status: active
kind: component
authority: current
system: SYS-08
family: interface-projection
storybook: component
depends_on:
- REL-002
- DSK-012
- FOC-BLK-009
- DS-FRM-RESOURCE
platforms:
- web
---

# REL-003 — Relationship Composer

Parent: [[SYS-08 — Relationships]]

## Purpose

Provides the shared fast UI for creating and editing Semantic Relationships from Canvas, Focus, Review, Librarian proposals, and other contextual actions.

## Core interaction

The composer should read like a sentence rather than a database form: `[Mara] [owes a debt to ▼] [Seraphine]`. Normal creation is endpoints → predicate → commit. Most Relationships should not require a modal full of metadata.

## Single creation

Invoked from [[DSK-012 — Semantic Connect Interaction]], [[FOC-BLK-009 — Relationships Block]], object actions, Review, or Librarian proposals. If both endpoints are already known, focus directly on predicate selection. If one endpoint is missing, use Search/Object picker for the other.

## Batch creation

Supports the high-value Canvas workflow: select several source World Objects, activate Connect, click one common target, choose one predicate, and commit all Relationships as one conceptual action. Each Relationship remains independently addressable, but Undo can reverse the batch.

## Edit mode

Editing uses the same sentence model. Allow predicate changes, endpoint changes where appropriate, notes, temporal end/history, and provenance inspection. Meaningful semantic changes should remain understandable operations rather than silent field churn.

## Custom predicates

Typing a phrase not in the registry can create a custom Relationship Type. The composer can suggest a normalized key, inverse wording, and category; the GM confirms only what is needed to make future rendering natural.

## Progressive detail

Secondary detail can expose note, story position, Source/provenance, and custom inverse phrase. Keep these collapsed during ordinary quick creation.

## Appearance & behaviour

Compact, sentence-like, and keyboard-friendly. Predicate selection supports typeahead, recent/frequent predicates, contextual ranking, and categories. Escape cancels; Enter commits where unambiguous.

## Relationships

- [[REL-002 — Relationship Type Registry]]
- [[REL-007 — Relationship Temporal History]]
- [[REL-008 — Relationship Provenance & Proposal]]
- [[DSK-012 — Semantic Connect Interaction]]
- [[FOC-BLK-009 — Relationships Block]]

## Handoff

Build **REL-003 — Relationship Composer** as the shared sentence-based create/edit flow, including multi-source batch creation.
