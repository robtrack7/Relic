# Relic V2 — Chronicle & Temporal World Model

> **This is the origin document — the thinking, not the contract.** The durable
> law it produced lives in [`WORLD-MODEL.md`](../../WORLD-MODEL.md) § Story time
> and in `AGENTS.md` invariant 8. The operational reference for implementing any
> of it is
> [`.claude/skills/relic-ux/references/temporal-chronicle.md`](../../.claude/skills/relic-ux/references/temporal-chronicle.md).
> Change those when a decision changes; keep this as the record of why.

## Purpose

Relic's present-day Boards are snapshots of a living world. Chronicle explains **how that world became what it is**.

The structural law is:

> **Identity is permanent. State is temporal. Presentation is projected.**

Mara in Session 4 and Mara now are the same person at different points in her history. Her location, allegiance, relationships, knowledge and goals may have changed. Relic must retain those meaningful changes instead of overwriting the past with the present.

## Two clocks

Relic needs both:

- **Transaction time** — when the database/user recorded or corrected something.
- **Story time** — when it happened or was true in the fiction.

These cannot be conflated. A retcon entered today may alter story truth years earlier while the audit still records that the correction happened today.

## Current projection + retained history

Do not rebuild Relic as pure event sourcing.

Keep a fast **Now projection** for Desk, Search, Stage and ordinary Librarian requests. Beneath it, retain story Events and story-valid state transitions.

`World Object + story position = state shown by Relic.`

## Events are Chronicle's atoms

A story Event is a meaningful occurrence: someone learns something, a promise is made, a place burns, an alliance breaks, a mystery advances.

Events connect to participants, places, Threads, sources, causes/consequences and story position. Scenes may group Events but do not need to become a heavyweight subsystem.

## Story position tolerates uncertainty

Chronology may be exact, Session/Scene ordered, relative, ranged or uncertain. Relic should preserve `before Session 4` rather than invent a fake date. Future custom calendars can map onto the same story positions.

## Temporal state

Only narratively meaningful state needs history: location, status, office, allegiance, holder, important conditions/goals and similar changes.

Relationships also evolve through time.

## Knowledge is especially valuable

Meaningful Character knowledge/belief should support states such as `knows`, `believes`, `suspects`, `was told`, linked to the Event/story point where it changed and its sources.

Do not model every character × fact pair. Unknown/unmodeled is valid.

This enables reliable questions such as:
- What does Mara know now?
- What did she know before the cathedral?
- Who knew the Queen was involved by Session 12?

## Threads are narrative currents

A Thread is a persistent line of narrative pressure: mystery, promise, arc, conflict, consequence, unresolved question or quest.

Events may belong to multiple Threads. That semantic overlap creates meaningful Chronicle junctions.

Threads are first-class in the model but should usually surface contextually rather than demand a dedicated workflow.

## Chronicle

> **Chronicle is the world under temporal gravity.**

Time orders Events horizontally. Threads pass through them as narrative currents. Characters, Places and Factions gather around the moments where they mattered. A visual intersection is meaningful only when the underlying semantics actually intersect.

Semantic zoom moves from Saga shape → Sessions/turning points → Events → claims/knowledge/relationships/sources.

A quiet **Now** line separates happened history from current/future possibility. Material beyond Now is normally Pencil: prep, consequence, prediction or unresolved pressure.

Chronicle may re-cluster around Thread, Place, Character, Faction or selected conflict while time remains stable. A saved Chronicle arrangement is a temporal argument in the same way a Board is a spatial argument.

## Entity history

An expanded entity defaults to Now but can reveal meaningful history. Selecting a past Event/story point should project the same entity **as it existed then**—including what it knew, where it stood and which relationships existed.

Never give historical Mara knowledge she only acquired later.

## Librarian

For temporal questions, resolve story position structurally before prompting the model. Retrieve the relevant as-of state, Events and sources, then reason.

The Librarian edits semantic structures—Events, Thread membership, story ordering, knowledge, relationships, clustering intent—not graphical coordinates. Deterministic layout algorithms render those semantics into Chronicle/Board geometry.

## Retcons

Corrections preserve audit/source history, deliberately update the story-valid fact, recompute dependent Pencil, surface conflicts with settled claims, and refresh the Now projection and Chronicle. The Librarian never silently rewrites settled truth.

## Boundary

Relic is not a world-state simulator. Temporalize what matters to narrative understanding. Avoid exhaustive inventories, continuous position tracking, full NPC knowledge matrices and fabricated chronology.
