---
id: PLT-004
status: active
kind: platform
authority: current
system: SYS-19
family: core-domain-security
storybook: none
depends_on:
- CHR-001
---

# PLT-004 — Temporal State & Change-Set Transaction Engine

Parent: [[SYS-19 — Platform & Data Architecture]]

## Purpose

Implements Relic's core trust model: permanent identity, temporal state, narrative Change Sets, proposals, direct GM semantic writes, correction/revert and retcon.

## Temporal axes

Persist the distinction between:

**Story time** — when a state is true in the fiction.

**System/audit time** — when Relic recorded, proposed, settled, corrected or superseded it.

These must never collapse into one timestamp.

## Story Position

Implement [[CHR-001 — Story Time & Position Model]] as a first-class durable concept with stable identity and meaningful ordering.

It must support:
- Session/Event anchors;
- between-Session positions;
- pre-play World history;
- inserted/corrected historical positions;
- optional display labels without requiring a custom calendar engine.

## Current and historical state

Keep **Now** fast.

A recommended initial strategy is:
- current resolved state optimized for ordinary product reads;
- durable temporal versions/snapshots for historical projection;
- immutable mutation/audit lineage for trust/debugging.

Historical Focus should not need to replay the entire campaign from genesis on every open.

## Change-set hierarchy

Generalized write model:

`Change Set → Story Change → Atomic Mutation`

A Change Set represents one conceptual user/workflow action.
A Story Change groups human-understandable narrative meaning.
A Mutation applies one precise semantic state change.

## Write origins

The same semantic transaction architecture supports:
- direct GM/manual edit → validate + commit;
- explicit GM-via-Librarian instruction → validate + commit with GM-instruction provenance;
- Supervised AI generation → validate + store proposed Change Set;
- eligible Semi/Autonomous work → validate policy + commit;
- Session settlement → commit reviewed Story Changes;
- correction/revert/retcon → commit explicit lineage-aware change.

## Mutation contract

A mutation should conceptually preserve enough data for:
- target type/ID;
- operation;
- state at proposal time;
- proposed/final payload;
- expected revision;
- effective Story Position;
- authority/origin;
- evidence/provenance;
- settlement/protected state;
- correction/supersession lineage.

## Transaction sequence

Meaningful commits should:
1. re-check actor/scope;
2. verify expected revisions;
3. validate domain schemas;
4. enforce authority/autonomy/protected-action rules;
5. apply semantic state;
6. write temporal version/current state;
7. append immutable audit/provenance;
8. update proposal/change-set resolution;
9. enqueue derived indexing/projection work.

Coherent Story Changes commit atomically where partial application would misrepresent the story.

## Truth layers

The persistence layer must support the Section 14 distinction:
- Settled;
- Pending;
- Corrected/Reverted;
- Evidence.

Ordinary Now never silently includes Pending.

## Flexibility

Exact tables, event-sourcing degree and snapshot strategy are intentionally flexible. The hard contracts are semantic transaction centralization, dual temporal axes, revision safety, auditable lineage and correct as-of resolution.

## Handoff

Build this engine before allowing many feature-specific semantic write paths. It should become the default route for World/Relationship truth changes.
