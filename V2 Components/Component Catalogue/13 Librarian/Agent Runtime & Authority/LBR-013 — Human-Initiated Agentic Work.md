---
id: LBR-013
status: active
kind: behavior
authority: current
system: SYS-13
family: agent-runtime-authority
storybook: none
depends_on:
- LBR-006
- LBR-010
- LBR-012
---

# LBR-013 — Human-Initiated Agentic Work

Parent: [[SYS-13 — Librarian]]

## Purpose

Defines when AI work is allowed to begin and how the Librarian can continue agentically toward a bounded goal without consuming credits through unsolicited background activity.

## Core law

> **Relic is proactive. The Librarian is agentic.**

Relic automatically surfaces deterministic product facts and workflow state.

The Librarian performs intelligent work only when the GM starts or triggers that work, then may pursue the authorized goal through multiple steps.

## Valid task origins

**Direct GM request** — `Organize these Characters by faction.`

**Explicit UI command** — `Generate Session Prep`.

**Configured workflow triggered by GM action** — `End Session` triggers transcription, interpretation, recap, Change Set creation and configured Settlement processing.

**Continuation of an already-authorized goal** — `Go through this imported campaign document and build the world from it.`

## Invalid origins

Do not start model work merely because the user navigated, changed selection, opened Focus, changed Scene, advanced Encounter Flow, let time pass, started recording, or because the model independently decided something might be useful.

## Agentic continuation

Once a goal is authorized, the Librarian may plan, retrieve, use multiple tools, iterate, make reversible intermediate changes where authorized, complete the bounded objective, and ask the GM only when required. **Agentic continuation is allowed. Agentic self-assignment is not.**

## Deterministic-first rule

Before invoking AI, Relic asks: `Can this be computed directly from known application state?`

If yes, use product logic. Examples: missing Board placements, unresolved Settlement count, recording status, readiness, changed markers, offline/sync state, current participant.

## What requires Librarian intelligence

Use AI for interpretation, synthesis, creation, reasoning, and semantic orchestration: `What matters here?`, `Summarize the Session`, `Create something suitable`, `What does this imply?`, `Find a monster appropriate to this`, `Correct the interpretation of what happened.`

## Stage rule

No model call merely because Scene, current participant, Entity Rail, selection, or recording state changes. Explicit requests and already-triggered workflows remain fully capable.

## Saga creation

First-run assistance follows the same invariant:
- opening a new/empty Desk does not trigger AI;
- importing/storing Source material does not trigger AI;
- `Build from this` or `Organize into my Saga` is the explicit workflow origin;
- the Librarian may then continue the bounded creation task agentically.

## Workflow-trigger examples

`End Session` → post-session AI processing because ending the Session explicitly triggers that workflow.

`Import Source` → indexing always; AI extraction only if the workflow explicitly promises/configures it.

`Ready for Stage` → deterministic packet preparation by default; no hidden AI pass unless explicitly part of the workflow.

## Cost principle

> **Model calls should correspond to an understandable user goal or product workflow.**

Opening the Librarian, changing selection, or navigating should not itself spend AI credits.

## Settings and notifications

Deterministic Settings/usage/notification state does not count as Librarian work.

Examples:
- Session processing ready;
- quota/storage warning;
- sync/recovery warning;
- current autonomy setting.

These are product facts surfaced without a model call.

## Relationships

- [[LBR-006 — Context Assembly & Grounding Layers]]
- [[LBR-010 — Action Planning & Change Sets]]
- [[LBR-012 — Execution, Progress, Receipt & Undo]]
- [[REV-001 — Post-Session Processing Pipeline]]

## Handoff

Build **LBR-013 — Human-Initiated Agentic Work** as a runtime invariant: no self-starting model work, but full multi-step continuation after a clear human/workflow trigger.
