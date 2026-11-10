---
id: SET-007
status: active
kind: component
authority: current
system: SYS-17
family: ai-usage
storybook: component
depends_on:
- LBR-012
- LBR-013
- PLT-015
platforms:
- web
---

# SET-007 — Usage Credits & AI Activity

Parent: [[SET-001 — Settings Surface & Scope Navigation]]

## Purpose

Gives the GM a clear account/workspace-level view of AI, transcription and storage usage
without exposing low-level provider token accounting.

## Usage summary

Present human-facing meters where applicable:
- AI credits;
- transcription minutes;
- storage.

Include reset/billing-period context when the plan uses one.

## Recent AI activity

Provide a restrained activity view grouped by understandable origin.

Examples:
- `Session 14 processing · 15 credits`
- `Librarian · Create Rhest · 3 credits`
- `Librarian · Rules question · 1 credit`
- `Saga setup · 10 credits`

This should answer:
`Where did my AI usage come from?`

## Traceability

Every entry should be attributable to the task-origin model from
[[LBR-012 — Execution, Progress, Receipt & Undo]] / [[LBR-013 — Human-Initiated Agentic Work]].

There should be no mysterious untraceable background AI consumption.

## Presentation boundary

Do not expose ordinary users to:
- provider token counts;
- input/output token pricing;
- reasoning token controls;
- raw model routing logs.

Internal diagnostics may retain those separately.

## Quota exhaustion

Running out of AI credits must not disable:
- manual world editing;
- Stage;
- viewing canon;
- manual Prepare;
- safe End Session;
- export/ownership access.

AI-dependent workflows can clearly state they require additional allowance/provider access.

## Warnings

Keep warnings calm and factual.

Example:
`18 AI credits remaining this period.`

## Relationships

- [[LBR-012 — Execution, Progress, Receipt & Undo]]
- [[LBR-013 — Human-Initiated Agentic Work]]
- [[SET-008 — AI Provider & Model Connections]]

## Platform usage owner

Metering, task-origin attribution and quota enforcement are implemented by [[PLT-015 — Usage Quotas Notifications Retention & Export]] plus the AI run ledger.

## Handoff

Build **SET-007 — Usage Credits & AI Activity** as transparent human-level metering tied
to understandable product actions.
