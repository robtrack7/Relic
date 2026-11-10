---
id: PLT-010
status: active
kind: platform
authority: current
system: SYS-19
family: ai-retrieval-async
storybook: none
depends_on:
- PLT-004
---

# PLT-010 — Librarian Task Runtime & Semantic Tool Executor

Parent: [[SYS-19 — Platform & Data Architecture]]

## Purpose

Implements Section 13's human-initiated agentic contract with bounded semantic tools, frozen context and deterministic execution.

## Task record

Every Librarian/AI workflow task should preserve an understandable conceptual record including:
- origin type/ID;
- user goal;
- context snapshot/reference;
- Workspace/World/Saga;
- Story Position;
- authorized capabilities;
- autonomy mode;
- budget/limits;
- status/result.

## Origin invariant

Valid origins include:
- GM message;
- explicit UI action;
- End Session workflow;
- Import/Organize workflow;
- continuation of an already-authorized task.

There is no valid `model decided to help` origin.

## Context snapshot

Freeze request meaning at task start.

Store references/semantic metadata sufficient to reconstruct the context rather than serializing the entire database into one opaque prompt blob.

## Tool registry

Expose code-owned semantic tools with strict schemas.

Examples:
- world create/update;
- relationship create/end;
- board arrange/place;
- session Scene/Instance operations;
- encounter participant/flow operations;
- settlement revision/settlement;
- temporal compare/history;
- Source retrieval.

Each tool declares authority class, validation, protected status, idempotency behavior and result schema.

## Execution chain

`Model request → schema validation → authority gate → RLS/domain validation → deterministic executor → database`

The model never bypasses the executor to issue raw SQL or arbitrary storage operations.

## Bounded continuation

Agentic tasks may continue automatically after human/workflow initiation but must be bounded by configurable constraints such as:
- tool steps;
- cost/credits;
- elapsed time;
- retries;
- protected-action interruptions.

## Semantic writes

World-truth-changing tools route through [[PLT-004 — Temporal State & Change-Set Transaction Engine]].

Board/session composition tools may use their domain mutation paths while still producing understandable receipts/provenance.

## Flexibility

Exact agent loop framework/provider SDK may change. Human-origin traceability, semantic tool schemas, authority validation and deterministic execution are hard invariants.

## Handoff

Implement the tool executor before granting broad tool access to models; use tests to prove no tool can exceed the user's/saga's effective authority.
