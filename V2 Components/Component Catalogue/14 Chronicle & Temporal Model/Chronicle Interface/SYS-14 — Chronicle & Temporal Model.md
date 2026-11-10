---
id: SYS-14
status: active
kind: system
authority: current
system: SYS-14
storybook: none
---

# SYS-14 — Chronicle & Temporal Model

## Purpose

Owns Relic's story-time model and Chronicle lens: how identity persists while state changes, how Now and historical/as-of projections resolve, how settled/pending/corrected truth is distinguished, and how story history remains separate from edit/audit history.

## Core laws

> **Identity is permanent. State is temporal. Presentation is projected.**

> **Story time is not edit time.**

Chronicle asks what happened in the story. Temporal state asks what was true at a story position. Audit asks what users/AI/software recorded, settled, corrected, or reverted. These are connected but not the same stream.

## Product position

Chronicle is a Desk lens/workspace view reached through [[APP-005 — Current Context Control]], object history, Events, temporal traces, deep links, or Librarian.

It is not a permanent global navigation destination, Board, Event family, database, calendar, or activity feed.

## Stable contracts

The following are semantic invariants even if implementation changes:
- Story Position is distinct from recorded/edit time.
- Now means latest settled story-valid state for the active Saga.
- one canonical temporal-resolution contract serves product surfaces;
- historical projections cannot leak future state;
- families declare which semantics are temporal;
- Settled, Pending, Corrected/Reverted, and Evidence remain distinct;
- End, Correct, and Retcon are different operations;
- Retcon is protected and impact-aware;
- Chronicle excludes routine software/edit activity;
- temporal navigation itself never invokes AI.

## Implementation latitude

This section intentionally specifies **contracts and observable behaviour more strongly than code compartmentalization**.

Codex/Claude may merge or split resolver, history, comparison, cache, projection, and Chronicle UI modules as implementation knowledge improves, provided the semantic contracts above and public behaviours remain intact.

Do not preserve file-to-code symmetry for its own sake. Prefer a small number of well-owned modules with explicit interfaces over duplicated family-specific temporal engines.

## Catalogue

### Chronicle Interface

- [[CHR-004 — Chronicle Workspace State]]
- [[CHR-005 — Chronicle Stream]]
- [[CHR-006 — Story Position Control]]
- [[CHR-007 — Chronicle Entry & Story Change Group]]
- [[CHR-008 — Object History & As-Of Navigation]]
- [[CHR-009 — Temporal Compare]]
- [[CHR-010 — Temporal Truth Layers]]
- [[CHR-011 — Historical Editing, Correction & Retcon]]
- [[CHR-012 — Temporal Deep Links & Return Context]]

### Librarian Bridge

- [[CHR-013 — Chronicle Librarian Context Bridge]]

### Temporal Core

- [[CHR-001 — Story Time & Position Model]]
- [[CHR-002 — Temporal State Model]]
- [[CHR-003 — Temporal Resolver & Now Projection]]
