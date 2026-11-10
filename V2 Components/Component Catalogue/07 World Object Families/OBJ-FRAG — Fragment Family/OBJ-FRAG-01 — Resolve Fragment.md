---
id: OBJ-FRAG-01
status: active
kind: behavior
authority: current
system: SYS-07
family: fragment
storybook: none
depends_on:
- DS-OBJ
---

# OBJ-FRAG-01 — Resolve Fragment

Parent: [[OBJ-FRAG — Fragment Representation Family]]

## Purpose

Transforms an unresolved Fragment into better-understood world structure without making the GM feel that the original capture was deleted and replaced by an unrelated record.

## Entry points

Resolve can be invoked from:
- Fragment Card/Expanded Card;
- Fragment Focus;
- Review/Settlement;
- Librarian proposal;
- Session capture processing.

Resolution is always explicit in Supervised/default workflows.

## Resolution outcomes

**Become a new World Object**
Possible target families:
- Character;
- Place;
- Faction;
- Artifact;
- Thread;
- Event;
- Source.

**Merge/incorporate into an existing World Object**
Examples:
- add Fragment text to Character GM Notes;
- add clue to Thread;
- add detail to Place Narrative;
- add Event consequence;
- attach excerpt to Source;
- add relationship context.

**Stay Fragment**
Always valid.

The system can also split one Fragment into several proposed objects only through an explicit multi-change proposal/review flow.

## Interaction

A compact Resolve flow should:
1. choose/confirm destination type or existing object;
2. preview the meaningful resulting change;
3. preserve original capture/source context;
4. apply as one understandable operation;
5. offer Undo where feasible.

The GM should not be forced through full entity creation forms.

## Identity and history

UX principle:

> The thought became understood.

Resolution must preserve:
- original Fragment identity/history or a durable resolution record;
- originating Session;
- timestamp/story context;
- provenance;
- linked Source;
- author/origin;
- relationship to the resulting object(s).

The exact database strategy can be decided in the domain/platform pass, but history must remain traceable.

## Librarian relationship

Librarian may suggest:
- likely target family;
- matching existing objects;
- extraction of structured fields;
- possible Event/Thread implications.

In Supervised mode, Librarian proposals do not settle resolution without GM approval.

## Review relationship

Post-session Review is a major resolution surface.

Session captures may enter Review as Fragments and be:
- accepted as Fragments;
- resolved to typed objects;
- merged into existing objects;
- rejected/discarded where appropriate.

The same underlying Resolve behavior should be reused rather than building a Review-only transformation system.

## Failure / recovery

If a multi-write resolution partially fails, retain the original Fragment and present a recoverable failed action rather than leaving content lost or ambiguously transformed.

## Handoff

Implement **OBJ-FRAG-01 — Resolve Fragment** as the shared explicit transformation/merge workflow that preserves the history and provenance of captured thought.
