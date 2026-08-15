# Coding contracts

## Build states, not page inventories

For each interaction define:
- entry context;
- user intent;
- visible state;
- state mutation/domain operation;
- async boundary;
- success;
- failure/recovery;
- undo/back;
- narrow-screen behavior;
- accessibility/focus behavior.

Routes are implementation details.

## Keep state domains separable

### Identity/world object
Stable ID/type/name.

### Current world projection
Fast Now-state for ordinary reads.

### Temporal/story history
Events, validity intervals, historical relationships/knowledge and story order.

### Claims/provenance
Truth/epistemic state, source, visibility and audit.

### Maturity
Pencil/Ink settlement of objects/material.

### Composition
Board placement, grouping, viewport, local presentation.

### Focus/lens
Selection, deep Focus, relationship/Chronicle/map projection.

### Session working state
Prepare ordering, pins, objective/opening, live emphasis.

### Evidence
Captures, Marks, transcript/audio/imports.

### Librarian operations
Typed semantic intents/jobs, undo grouping and resulting proposals/changes.

### UI transient
Open sheet, hover, temporary optimistic state.

Do not collapse these into a single mutable `entity` or page form.

## Current projection + history

Maintain fast current-state reads and append/retain story history. Do not force Stage or Search to reconstruct entire history for current answers.

Story-time validity and transaction/audit time are distinct. Read `temporal-chronicle.md` before schema work in this area.

## Optimistic UX

Good candidates:
- composition move/group;
- Focus/selection;
- autosaved working text;
- local capture with durable queue;
- safe reversible Librarian composition.

Do not optimistically claim irreversible delete or truth commit if server validation/permissions can reject it.

## Autosave

Autosave working material so writing feels direct.

Requirements:
- preserve local input through network failure;
- show quiet saving/saved/failed state when useful;
- prevent stale server response from overwriting newer local edit;
- use version/conflict handling;
- distinguish `autosaved working text` from `established claim` or `matured Ink`.

## Librarian execution

Backend should prefer a structured semantic operation layer:
1. derive trusted scope/selection/server state;
2. resolve temporal context if needed;
3. have model reason over text/structured summaries;
4. emit tool calls/typed intents rather than arbitrary UI JSON;
5. server validates IDs, RLS/permissions, versions and authority;
6. deterministic layout/render code maps semantics to visual composition;
7. group results under one conceptual undo/provenance record.

Avoid asking the LLM to calculate canvas coordinates, bezier paths, collision avoidance or graph layout. Let it express `near`, `cluster`, `emphasize`, `order`, `connect`, `attach`, `focus`.

## Async AI

- immediate local acknowledgement;
- preserve current work while running;
- stream only when useful/structurally safe;
- material can appear Pencil before fully settled;
- allow stop/cancel for materially long tasks;
- persistent jobs/conversations survive navigation when supported;
- stale target preserves result as conflict/proposal rather than overwriting.

## Focus lifecycle

- initialize keyboard focus once when a modal/sheet truly opens;
- passive timers/data refresh never steal focus;
- trap focus only for genuine modals;
- restore focus to invoking control;
- preserve typed values through rerenders.

## Stage performance and resilience

Stage is latency-sensitive:
- shell/local state immediately;
- lookup first useful unit near-instantly;
- capture perceived immediate;
- no blocking AI on primary live actions;
- local-first durable evidence/recording queue;
- stable idempotency keys;
- causal replay;
- End Session cannot leapfrog earlier evidence writes;
- failed upload never deletes local evidence;
- resolve most conflicts after play.

Use stricter repository budgets when present.

## Session lifecycle

Use the repository's current lifecycle; do not invent a parallel state machine. Preserve the UX principles:
- planned = editable preparation;
- ready = Stage preview/entry;
- live-start = deliberate boundary;
- in-progress = stable live packet where necessary;
- ending = safely reversible if supported;
- ended = synthesis/review begins.

## Review implementation

Review needs:
- source evidence before judgment;
- affected world context;
- accept/edit/reject/settle where appropriate;
- cause-aware grouping;
- completeness index;
- stale/conflict handling;
- one correction able to invalidate downstream Pencil.

Queue tables may remain useful backend infrastructure. Do not let their shape dictate the primary UI.

## Responsive adaptation

Do not map desktop geometry 1:1 to mobile.

Preserve intent, identity, history, sources, Librarian access, undo and session/focus. Change pane count, spatial layout, controls and density.

## Accessibility

- Pencil/Ink and truth states need semantic labels beyond color/line style;
- spatial relationships need readable ordered representations;
- reduced motion preserves causality;
- screen readers can inspect relationship/history structures;
- Stage/mobile controls use large targets;
- recording/offline states are perceivable without animation.

## Telemetry

Measure continuity outcomes, not click volume:
- idea created before classification;
- time to first useful Stage search result;
- capture recovered;
- Prepare opened/ready;
- Librarian action accepted/edited/undone;
- review completed;
- temporal/as-of retrieval success;
- conflict encountered/resolved.
