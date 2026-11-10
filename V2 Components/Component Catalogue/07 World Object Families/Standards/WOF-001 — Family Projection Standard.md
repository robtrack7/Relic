---
id: WOF-001
status: active
kind: family
authority: current
system: SYS-07
family: standards
storybook: none
---

# WOF-001 — Family Projection Standard

Parent: [[SYS-07 — World Object Families]]

## Purpose

Defines the standardized projection pattern used by Place, Faction, Artifact, Thread, Event, Source, and Fragment.

The goal is to maximize implementation reuse without collapsing distinct fictional types into one universal card or Focus page.

## Core rule

Standardize **roles and infrastructure**, not information hierarchy.

Every family starts from the same questions:
- What is the smallest useful Marker?
- What belongs on the normal Card?
- Does an Expanded Card materially improve spatial work?
- What makes the Focus family-specific?
- Can Search and Library share one index projection?
- Does Prepare need a genuinely different projection?
- What should the Stage Entity Rail show?
- Does Chronicle require an as-of-specific projection?

A dedicated component is only warranted where anatomy, hierarchy, interaction, or temporal behavior materially differs.

## Default spatial chain

For most persistent World Objects:

`Marker → Card → Expanded Card → Focus`

However:
- Expanded Card is optional when Card → Focus is sufficient.
- Two-sided Expanded Cards are opt-in.
- Marker is optional for families that are rarely placed spatially at far zoom.

## Index projection standard

Search and Library should share a family **Index Projection** when they can use the same anatomy.

The host surface decides:
- density;
- result highlighting;
- keyboard selection;
- grid/list arrangement.

The family supplies:
- recognition content;
- disambiguation;
- type-specific context.

Do not create separate Search and Library components merely because they appear in different surfaces.

## Prepare projection standard

Prepare receives a family-specific **Prepare Projection** only when session relevance changes what information should be shown.

Otherwise it can reuse the family Index Projection plus a shared Session Relevance cue.

Prepare content is session-local emphasis and does not rewrite canon.

## Stage projection standard

Stage normally uses:
1. a compact entry in the Stage Entity Rail;
2. the ordinary family Card / Expanded Card on the central Stage Canvas;
3. Focus when the GM needs depth.

Do not create a second Stage-specific card hierarchy unless live-play information truly cannot be expressed through the ordinary Canvas representation plus Stage/Librarian context.

The Stage Entity Rail itself belongs to the Stage system; each family contributes recognition content and contextual labels.

## Chronicle projection standard

A dedicated Chronicle Projection is warranted when:
- the family is inherently temporal;
- historical/as-of state materially changes interpretation;
- the Chronicle representation needs a different information hierarchy.

Chronicle always uses persistent identity rather than historical duplicate objects.

## Expanded card standard

Expanded Cards remain family-specific components.

A family can use [[OBJ-016 — Two-Sided Expanded Card Host]] when a second face has clear utility.

Do not add a back face simply for consistency.

Common examples:
- Character: narrative front / mechanics back.
- Artifact: narrative front / mechanics back when mechanics exist.
- Place: normally one-sided; optional map/mechanics back only where useful.

## Focus standard

Every family Focus is a separately owned surface using:
- [[FOC-001 — Focus Host]];
- [[FOC-004 — Focus Composition Contract]];
- reusable Focus Blocks.

The family owns:
- block order;
- emphasis;
- family-specific sections;
- which blocks are temporal.

There is no universal WorldObjectFocus component.

## Catalogue and implementation guidance

Keep one concise family packet as the retrieval/context owner for each World Object type. Independently rendered projections may have their own small component files so they can be designed and manually tested in Storybook without loading the whole family.

Catalogue granularity is **not** a mandate for production module granularity. Codex/Claude may implement several projections in one family package, share internal helpers, or split them further when the code benefits, provided family semantics and independently observable projection behavior remain intact.

Create/retain an atomic catalogue file when a projection or behavior has its own anatomy, interaction, Storybook state set, or independent review value. Do not create files merely for family symmetry.

## Temporal projections

Family Chronicle/as-of projections consume the shared Section 14 Story Position / Temporal Resolver contracts. Families own temporal meaning and presentation; they should not create independent temporal storage/resolution systems.

## Handoff

Use **WOF-001 — Family Projection Standard** as the implementation contract for all non-Character World Object families in Section 07.
