---
id: LBR-012
status: active
kind: behavior
authority: current
system: SYS-13
family: agent-runtime-authority
storybook: pattern
depends_on:
- APP-012
- REV-014
- LBR-010
platforms:
- web
---

# LBR-012 — Execution, Progress, Receipt & Undo

Parent: [[SYS-13 — Librarian]]

## Purpose

Defines how validated Librarian plans execute through Relic, how bounded work communicates progress, and how conceptual actions remain traceable/reversible.

## Execution

The application—not the model—executes validated semantic actions while enforcing identity/scope, permissions/RLS, version/current state, temporal rules, authority/autonomy, idempotency, and protected-operation policy.

## Task origin

Every run traces to direct GM request, explicit UI command, configured workflow triggered by GM action, or continuation of an already-authorized goal. Store understandable task origin/goal/scope for billing, debugging, and audit.

## Progress

Longer work may show concise product-level progress such as `Gathering relevant Characters…`, `Creating 4 Session Instances…`, or `Arranging the Board…`. Do not expose hidden reasoning.

## Cancellation

Bounded long operations should be cancelable before commit where technically possible. Conceptual writes should commit atomically where feasible.

## Receipt

Reuse [[APP-012 — Global Action Receipt]]. Do not create another receipt system inside Librarian.

## Undo

Composition can reverse directly; recent semantic actions use safe compensating Change Sets; older/dependent settlement routes through [[REV-014 — Revert, Correct & Audit]].

## Relationships

- [[APP-012 — Global Action Receipt]]
- [[LBR-010 — Action Planning & Change Sets]]
- [[REV-014 — Revert, Correct & Audit]]

## Run ledger owner

Conceptual tasks, provider calls and tool invocations are separated by [[PLT-011 — AI Routing Context & Run Ledger]] so usage and failures remain explainable.

## Handoff

Build **LBR-012 — Execution, Progress, Receipt & Undo** as deterministic execution around human-understandable task origin and conceptual-action reversibility.
