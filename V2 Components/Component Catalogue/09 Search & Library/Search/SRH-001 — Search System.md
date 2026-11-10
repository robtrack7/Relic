---
id: SRH-001
status: active
kind: domain
authority: current
system: SYS-09
family: search
storybook: none
depends_on:
- APP-004
- SRH-002
- SRH-003
---

# SRH-001 — Search System

Parent: [[SYS-09 — Search & Library]]

## Purpose

Defines Relic's global direct-retrieval system.

Search finds existing material and navigates to it quickly. It does not itself reason about the world, answer synthesized questions, or mutate canon.

## Searchable domains

Global Search can retrieve:

**World Objects**
- Character
- Place
- Faction
- Artifact
- Thread
- Event
- Fragment

**Sources**
- PDFs
- webpages
- transcripts
- notes/documents
- rules references
- images through metadata/captions where available

**Workspace/navigation**
- Boards
- Sessions
- mechanics/stat-block/rules templates where the active Saga permits direct instantiation

Future saved Chronicle/lens objects can join only when those systems exist.

## Live Session scope

During Prepare/Stage, Search can additionally surface [[STG-010 — Session Instance Model]] records relevant to the active Session.

Rules/bestiary/stat-block Sources and mechanics templates can rank highly when the user is looking for something to instantiate quickly into Prep or Stage.

Session Instances remain scoped Search results and do **not** become ordinary Library World Objects.

## Default scope

Default scope is:

**Current Saga + relevant current World material**

Sibling Sagas and other Worlds are excluded unless an explicit future cross-Saga workflow is invoked.

Authorization is enforced by the data layer, never by prompt filtering.

## Retrieval pipeline

Use a combined ranking pipeline rather than exposing implementation modes to the GM.

Priority, roughly:
1. exact title/name;
2. alias;
3. prefix/fuzzy identity;
4. current-context relevance;
5. structured metadata;
6. strong lexical body match;
7. semantic similarity;
8. modest recency tie-break.

An exact identity match should beat a vague semantic result.

## Current-context boosts

Ranking may modestly boost:
- active Board;
- active Session;
- current Focus;
- prepared/pinned objects;
- current Place;
- active Threads;
- pinned rules references.

Context cannot erase direct relevance.

## Pending settlement boundary

Ordinary Search treats **settled state as world truth**.

Pending Session interpretation must not rank/render as if canonical.

During Prepare/Review, contextual Search may expose pending Session changes with explicit `Pending` treatment when useful.

The Librarian may reason over both settled and pending context while preserving the distinction.

## Temporal boundary

Ordinary Search resolves **Now** projections.

Search can find historical Events, Sources, transcript text, or old mentions, but it does not interpret natural-language temporal questions into historical entity state.

Historical reasoning such as `Who was allied with House Valdrus before the siege?` belongs to Chronicle and the Librarian's retrieval/reasoning path.

## Librarian invocation boundary

Search can supply selected results/context to the Librarian, but ordinary searching, ranking, opening results, or changing query scope does not automatically invoke a model. The Librarian retrieval/Q&A path starts only from a human/workflow-triggered Librarian task.

## Librarian boundary

Search can provide selected results, Sources, excerpts, and deep-link targets to the Librarian's **retrieval / question-answering context**.

Section 09 does **not** define the Librarian as a whole.

It does not own:
- creating World Objects;
- editing world state;
- semantic proposals;
- tool execution;
- Board rearrangement;
- canon settlement;
- autonomy modes;
- Librarian conversation UX.

Those belong to the Librarian system.

The integration contract here is only:

`Search retrieval → selected context → Librarian retrieval/Q&A context`

## Performance

Quick identity results should feel immediate.

Where needed, return in phases:
1. identity/navigation results;
2. body/source matches;
3. semantic matches.

Do not block the first useful result waiting for the complete result set.

## Offline behaviour

When offline/degraded, Search may use locally cached:
- identities;
- prepared/pinned session material;
- recent objects;
- cached Sources.

The UI must not imply the result set is globally exhaustive when scope is reduced.

## Relationships

- [[APP-004 — Global Search & Quick Open]] — global entry.
- [[SRH-002 — Quick Search Results]]
- [[SRH-003 — Full Search Surface]]
- [[SRH-004 — Search Result Match Context]]
- [[SRH-005 — Search Scope & Filters]]
- [[FOC-010 — Focus Anchor & Deep Link]]
- [[OBJ-SRC-01 — Source Viewer]]

## Temporal resolver relationship

Ordinary Search defaults to Now / settled truth using [[CHR-003 — Temporal Resolver & Now Projection]]. Search should not independently infer historical state from old text. Historical discovery may navigate into Chronicle/as-of context when explicitly requested.

## Future player retrieval

Future [[PUB-008 — Permission-Safe Search & Retrieval]] reuses Search principles only over RLS-authorized published material.

Player queries must never search the GM corpus and depend on client/model filtering to hide secrets.

## Platform retrieval owner

Indexing, authorization and UI/task retrieval contracts are implemented by [[PLT-009 — Search Indexing & Retrieval]].

## Handoff

Implement **SRH-001 — Search System** as fast authorization-safe retrieval/navigation with a narrow context handoff to the future Librarian retrieval/Q&A path.
