---
id: REV-003
status: active
kind: component
authority: current
system: SYS-12
family: settlement-model-lifecycle
storybook: component
depends_on:
- REV-004
- REV-010
- REV-012
- DS-WFL
platforms:
- web
---

# REV-003 — Session Story Carriage

Parent: [[REV-002 — Session Settlement Workspace]]

## Purpose

Provides the left-side narrative index of the Session interpretation so the GM can recognize the story quickly and spot anything that feels wrong.

## Anatomy

Recommended sections:

**Session**
- number/title/date;
- settlement state.

**What happened**
- concise AI-generated Session summary;
- key Story Changes.

**World changed**
- affected World Objects;
- Relationships created/ended;
- Threads advanced/resolved;
- Events created;
- persistent Session Instance promotions where relevant.

**Needs attention**
- ambiguous identity;
- conflict;
- weak/broken evidence;
- protected action;
- unresolved interpretation.

**Next Session**
- prep implications;
- carry-forward consequences.

## Interaction

Selecting a Story Change updates the central Settlement Canvas/detail.

Selecting an affected World Object can:
- locate it in Settlement Canvas;
- open its change detail;
- deep-open ordinary Focus.

The carriage is a story navigator, not a checklist.

## Progress

Use quiet state cues:
- reviewed;
- pending;
- auto-settled;
- needs attention;
- corrected;
- source changed.

Avoid gamified completion percentages.

## Ordering

Prioritize:
1. Needs Attention / protected operations;
2. major multi-object Story Changes;
3. marked moments;
4. routine supported changes;
5. prep implications.

Routine items should not drown the meaningful exceptions.

## Relationships

- [[REV-004 — Session Change Set & Story Changes]]
- [[REV-010 — Exceptions, Conflicts & Protected Changes]]
- [[REV-012 — Recap & Prep Implications]]

## Handoff

Build **REV-003 — Session Story Carriage** as the concise narrative spine of post-session settlement.
