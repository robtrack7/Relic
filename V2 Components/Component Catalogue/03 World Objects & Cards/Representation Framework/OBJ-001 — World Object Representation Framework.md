---
id: OBJ-001
status: active
kind: family
authority: current
system: SYS-03
family: representation-framework
storybook: none
---

# OBJ-001 — World Object Representation Framework

Parent: [[SYS-03 — World Objects & Cards]]

## Purpose

Defines the common representation model for persistent fictional things in Relic.

A World Object is not a page, card, or database row in the product experience. It is persistent fictional identity that can be projected into different separately coded representations depending on surface, task, disclosure level, story position, and spatial scale.

This framework keeps those concerns separate so the same Character, Place, Thread, Event, Source, Artifact, Faction, or Fragment can appear throughout Relic without being copied.

## Core vocabulary

**Identity** — the persistent fictional thing.

**State** — narratively meaningful facts about that identity at a story position.

**Projection** — a separately coded UI representation selected for a particular context.

**Placement** — where and how a projection appears on a specific Board.

**Disclosure** — how much of the object the GM has intentionally chosen to expose in the current context.

**UI state** — transient conditions such as hover, selected, loading, Pencil, Ink, stale, or conflict.

These concepts can interact but must not collapse into one another.

## Representation roles

Common roles include:

- **Small Card** — compact Desk representation with image/name recognition.
- **Expanded Card** — richer intentional in-place representation with bounded family essentials.
- **Focus** — right-side editorial exploration and contextual-editing workspace.
- **Entity Builder** — central authoring workspace for creation, deep writing, and supported block arrangement.
- **Library Projection** — systematic browsing.
- **Search Result** — fast recognition and navigation.
- **Prepare Projection** — session-prep emphasis.
- **Stage Projection** — live-play emphasis.
- **Chronicle Projection** — temporal emphasis.

A family receives only the roles that materially require different anatomy, hierarchy, layout, interaction, or code. Far semantic zoom is a simplified Small Card rendering, not a third user-facing Marker form. A family may omit Expanded Card when it has no bounded essentials.

## Use

The registry uses this framework whenever a persistent World Object appears in more than one surface or disclosure level.

It allows product and implementation work to resolve a concrete representation such as:

`Character + Desk + normal → Character Card`

rather than treating each occurrence as unrelated UI or forcing every occurrence through one giant adaptive component.

## Relationships

- [[OBJ-002 — World Object Projection Resolver]] — selects the appropriate projection.
- [[OBJ-003 — Representation Transition Coordinator]] — coordinates transitions between projections.
- [[BRD-006 — Placement Host]] — owns Board-local geometry and presentation context.
- [[FOC-001 — Focus Host]] — shared right-side host for deep Focus surfaces.
- [[FOC-013 — Entity Builder Host]] — shared central authoring host.
- World Object family routers — declare which projections each family actually supports.

## Handoff

Use **OBJ-001 — World Object Representation Framework** as the shared representation model for all persistent World Object families; do not implement it as one universal card.
