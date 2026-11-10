---
id: DSK-029
status: active
kind: component
authority: current
system: SYS-02
family: selection-placement
storybook: component
depends_on:
- LBR-001
- APP-012
- DSK-028
- DS-CAN
platforms:
- web
---

# DSK-029 — Canvas Proposal Layer

Parent: [[DSK-002 — Canvas Viewport]]

## Purpose

Displays spatial changes that Relic/Librarian is proposing before they become the committed Board composition when preview is useful.

This is the home of the distinctive dashed-outline proposal language.

## Context & placement

Rendered above committed Board content but below transient menus/selection chrome.

Proposal geometry lives in a temporary proposal coordinate layer aligned to the active Board.

## Anatomy

Can represent:
- proposed new World Object placements;
- proposed Board Sections;
- suggested movement/rearrangement;
- proposed grouping;
- proposed semantic Relationships;
- proposed decorative composition.

A proposal set should have a clear local affordance to:
- Apply;
- Dismiss;
- Refine/continue through Librarian when appropriate.

## Appearance & behaviour

Proposed items should be visibly distinct from committed Board content without feeling like error states.

Use restrained dashed outlines, ghosted cards, or other proposal-specific treatments.

When accepted, proposed geometry should settle naturally into committed components rather than abruptly replacing the whole Canvas.

Not every reversible Librarian composition action requires preview. The Layer appears only when the action contract calls for a proposal.

## States & variants

- proposed placement;
- proposed movement;
- proposed group/Section;
- proposed relationship;
- multi-change proposal set;
- applying;
- dismissed.

## Relationships

- [[LBR-001 — Librarian Carriage]] — may describe/refine the proposal.
- Librarian registered actions — supply semantic proposal intent.
- [[APP-012 — Global Action Receipt]] — confirms applied operation.
- [[DSK-028 — Canvas Undo & Redo]] — can reverse applied composition.

## Data / utility relationship

Proposal state is temporary and separate from authoritative Board composition until applied. Applying a multi-change proposal should commit as one conceptual change set where possible.

## Handoff

Build **DSK-029 — Canvas Proposal Layer** as the dashed/ghosted temporary spatial layer for previewable Librarian and system proposals.
