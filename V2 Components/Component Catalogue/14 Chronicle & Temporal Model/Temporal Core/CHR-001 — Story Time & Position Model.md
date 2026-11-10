---
id: CHR-001
status: active
kind: domain
authority: current
system: SYS-14
family: temporal-core
storybook: none
depends_on:
- SES-001
- OBJ-EVT
- CHR-003
---

# CHR-001 — Story Time & Position Model

Parent: [[SYS-14 — Chronicle & Temporal Model]]

## Purpose

Defines the common coordinate system for story chronology without requiring a custom fantasy calendar.

## Story Position

A Story Position identifies **where in fictional continuity** a fact/state applies. It may anchor to:
- Now;
- Session;
- position within/around a Session;
- Event;
- between Sessions;
- pre-campaign/world history;
- manually authored historical anchor;
- approximate/relative historical position.

## Story time versus recorded time

Store/retain the distinction between:

**Story position** — when something was true in the fiction.

**Recorded / edited / settled at** — when Relic or the GM entered, corrected, or settled it.

Example: a Session 11 correction can establish that Mara joined a faction in Session 4. The story-valid effective position remains Session 4.

## Now

`Now` means the latest **settled story-valid** state for the active Saga.

It is not today's wall-clock date, most recently edited row, newest database event, or pending interpretation.

## Ordering and precision

Story Position should support deterministic ordering without pretending every event has exact time. Preserve known precision/anchoring rather than fabricating dates.

A fictional date label may decorate a position but is not required for ordering.

## Calendar boundary

No custom-calendar dependency. Future calendars may map labels/eras/dates onto Story Positions without replacing the underlying model.

## Implementation latitude

Exact storage may evolve: normalized anchors, sortable keys, event/session references, interval/order helpers, or derived position objects are all acceptable.

Keep one canonical comparison/order contract so product features do not invent incompatible temporal coordinates.

## Relationships

- [[SES-001 — Session Model & Lifecycle]]
- [[OBJ-EVT — Event Representation Family]]
- [[CHR-003 — Temporal Resolver & Now Projection]]

## Handoff

Implement **CHR-001** as a stable story-position value/ordering contract. Storage shape may change without forcing UI/product rewrites.
