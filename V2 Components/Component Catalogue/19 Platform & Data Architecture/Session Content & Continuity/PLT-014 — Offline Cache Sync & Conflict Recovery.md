---
id: PLT-014
status: active
kind: platform
authority: current
system: SYS-19
family: session-content-continuity
storybook: none
---

# PLT-014 — Offline Cache Sync & Conflict Recovery

Parent: [[SYS-19 — Platform & Data Architecture]]

## Purpose

Keeps Stage and essential campaign operation resilient through network loss while replaying changes through the same domain validation used online.

## Local store

For the current web product, use durable browser-local persistence such as IndexedDB (directly or through a replaceable storage abstraction) for the subset of state required by the active workflow.

Do not couple Stage/domain code directly to one browser library. Keep a small local-persistence boundary so a later Expo/mobile implementation can use Expo SQLite or another native adapter without changing semantic operation/recovery contracts.

## Stage minimum cache

For a Ready/In-Progress Session, cache enough for continuity, including as needed:
- Session;
- Scenes/Beats;
- relevant World Object snapshots;
- context references;
- Session Instances;
- Encounter Flow/participants;
- Session Mechanics State;
- captures/Fragments;
- Marked Moments;
- recording manifest/local segments;
- pending uploads;
- pending semantic operations.

## Semantic operation queue

Queue domain operations rather than generic `{table, operation, payload}` mutations.

Examples:
- `capture.create_fragment`;
- `scene.update`;
- `encounter.advance`;
- `session_instance.update`;
- `mechanics.set_resource`;
- `board.move_placement`;
- `recording.register_segment`.

Each operation carries stable ID/idempotency key, scope, local order/time and expected revision where relevant.

## Reconnect sequence

On reconnect:
1. upload immutable pending assets;
2. replay semantic operations in causal/order sequence;
3. dedupe idempotency keys;
4. apply clean operations through normal server validation;
5. collect conflicts;
6. continue play;
7. surface unresolved semantic conflicts after active play where possible.

## Authority

Server remains authoritative.

Offline cached state is optimistic/recoverable working state and cannot bypass RLS/domain validation merely because it was created locally.

## Conflict philosophy

Active play prioritizes continuity. Do not interrupt a live table with complex conflict resolution unless continuing would risk data loss or unsafe recording behavior.

## CRDT

Do not introduce CRDT complexity for the current single-GM model unless future collaborative editing requirements materially change the product.

## Flexibility

Physical local-store schema/library, cache hydration and replay batching may evolve. Semantic operation replay + idempotency + server validation are hard.

## Handoff

Build a web offline E2E scenario covering network loss → Stage edits/capture/recording → tab/browser interruption or reload → restore → reconnect → pipeline. A later mobile adapter must pass an equivalent semantic scenario.
