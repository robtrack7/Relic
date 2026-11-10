---
id: FOC-001
status: active
kind: surface
authority: current
system: SYS-06
family: focus-host-navigation
storybook: scene
depends_on:
- APP-001
- FOC-002
- FOC-006
- DS-FOC
platforms:
- web
---

# FOC-001 — Focus Host

Parent: [[SYS-06 — Focus & Shared Focus Blocks]]

## Purpose

Focus Host is the shared right-side, non-modal workspace in which a persistent World Object deepens from a Desk or Library projection into its family-specific Focus surface.

Focus is not a generic detail page, modal inspector, or Entity Builder. It is the editorial exploration and contextual-editing layer for the same object identity, preserving the surrounding Relic workspace and the context the GM came from.

## Context & placement

Focus occupies a right-side carriage supplied by [[APP-001 — Global App Shell]] and coordinated by [[APP-010 — Workspace Dock Manager]]. The uncovered Desk remains visible and interactive; Focus does not add a scrim or reframe the Canvas.

It can be entered from:
- a Board Placement;
- Library;
- Search;
- Prepare;
- Stage;
- Chronicle;
- Inline Object Reference / Object Peek.

When Focus opens from Desk or Library, the selected object deepens in the right-side carriage while the global shell and originating context remain intact.

When Focus opens during Stage, the intended three-column relationship remains valid:
- Stage Carriage on the far-left;
- Focus in the central workspace;
- Librarian Carriage on the right when open.

Focus does not dismiss Stage, Encounter Flow, the Stage Entity Rail, or the Librarian merely because the object has been deepened. Where measured space cannot support both right-side carriages, the Dock Manager retains both states and exposes an explicit switch; it must not silently move the Canvas camera.

## Viewport chrome

Focus adds only a small amount of its own chrome through [[FOC-002 — Focus Surface Chrome]].

Global controls remain inherited from the App Shell.

Long family Focus surfaces can expose [[FOC-006 — Focus Section Navigator]] without introducing a permanent application sidebar.

Historical/as-of viewing uses [[OBJ-009 — Historical & As-Of Indicator]] close to object identity.

## Use

The GM enters Focus when they need to understand, inspect, follow, or make contextual edits to one World Object without leaving the Desk.

Typical work includes:
- reading and editing narrative material;
- inspecting mechanics;
- reviewing relationships;
- understanding knowledge/beliefs;
- tracing meaningful Event history;
- inspecting Sources/provenance;
- reviewing current or historical state;
- using the Librarian with that object as implicit context;
- opening the separate [[FOC-013 — Entity Builder Host]] for creation, deep writing, or block authoring.

Closing Focus returns the GM to the exact originating context where practical.

## Appearance & behaviour

Focus should feel like a publication or living knowledge document rather than a CRUD form. Its family-declared pages use a real tab strip with restrained page/gesture transitions, omitting irrelevant or empty pages.

The focused object's family composition determines the actual content and hierarchy.

Focus should visually deepen from the originating representation where possible, preserving identity cues such as image and name.

The carriage becomes more document-like and readable, but should still feel connected to the spatial world that produced it. Focus and Builder are projections of one persistent identity and shared draft session, not separate records.

No giant modal frame or generic detail-page header should dominate the experience.

## States & variants

- opening transition;
- current/Now;
- historical/as-of;
- editing;
- Stage active;
- Librarian docked;
- Entity Builder active with live Focus preview when measured space permits;
- Stage + Librarian;
- loading/recovering;
- archived/unavailable object;
- closing/returning.

## Responsive behaviour

Wide layouts can preserve editorial multi-column composition and surrounding carriages.

As width reduces, Focus collapses to fewer columns before forcing Stage or Librarian into different modes.

At narrow widths, family blocks stack according to the declared Focus composition hierarchy and the Section Navigator collapses to a compact menu.

## Relationships

- [[FOC-002 — Focus Surface Chrome]] — shared Focus-level controls.
- [[FOC-003 — Focus Return Context]] — restores the originating surface/context.
- [[FOC-004 — Focus Composition Contract]] — defines family-specific block composition.
- [[FOC-005 — Focus Layout System]] — responsive editorial layout.
- [[FOC-011 — Focus Temporal Context]] — historical/as-of projection.
- [[FOC-012 — Focus Librarian Context Bridge]] — supplies focused context to Librarian.
- [[FOC-013 — Entity Builder Host]] — central authoring workspace for deeper creation and block editing.
- [[OBJ-003 — Representation Transition Coordinator]] — shared representation transition infrastructure.

## Data / utility relationship

Focus Host owns presentation and context preservation, not World Object data itself.

The family-specific Focus surface reads/writes the persistent object and related domain data through the relevant systems.

## Handoff

Build **FOC-001 — Focus Host** as the shared right-side editorial workspace that preserves Desk, Stage, Chronicle, Search, Library, and Prepare return context while keeping creation and deep block authoring in the separate Entity Builder.
