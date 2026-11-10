---
id: PREP-008
status: active
kind: component
authority: current
system: SYS-10
family: prepare
storybook: component
depends_on:
- OBJ-THREAD
- OBJ-EVT
- PREP-009
platforms:
- web
---

# PREP-008 — Carry-Forward Briefing

Parent: [[PREP-002 — Prepare Carriage]]

## Purpose

Surfaces the settled world changes and unresolved narrative pressure from recent play that may matter to the upcoming Session.

## Contents

Potential deterministic context:

**Last Session**
- settled summary;
- key Events;
- meaningful approved state changes.

**Loose Threads**
- unresolved/current Threads worth attention.

**Consequences**
- approved consequences likely to affect the next Session.

**Changed World Objects**
- Characters/Places/Factions/etc. with meaningful recent settled changes.

## Canon boundary

Default Carry-Forward content prioritizes approved/settled state. If the previous Session still has pending Review, show an explicit warning such as `Previous Session review pending — some changes may not be settled yet.` Do not present pending AI proposals as facts.

## Librarian relationship

Carry-Forward provides deterministic recent context to Prepare. The Librarian can naturally synthesize, prioritize, explain, or act on that context as part of its core capabilities. Generated synthesis is owned by the Librarian system, not by a special Prepare-only AI generator.

## Appearance & behaviour

Compact and skimmable. Do not overwhelm the Prep Carriage with a long historical feed. Emphasize the smallest set of changes likely to alter play tonight.

## Relationships

- Review & Settlement
- [[OBJ-THREAD — Thread Representation Family]]
- [[OBJ-EVT — Event Representation Family]]
- [[PREP-009 — Prep Librarian Context Bridge]]

## Temporal source

Carry-Forward uses the latest settled story-valid Now projection from [[CHR-003 — Temporal Resolver & Now Projection]], plus any explicitly marked Pending overlay described by [[CHR-010 — Temporal Truth Layers]].

## Handoff

Build **PREP-008 — Carry-Forward Briefing** as the settled-state bridge from prior play into the next Session's preparation.
