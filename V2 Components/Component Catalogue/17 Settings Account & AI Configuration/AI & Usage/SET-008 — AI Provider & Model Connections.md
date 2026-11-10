---
id: SET-008
status: active
kind: component
authority: current
system: SYS-17
family: ai-usage
storybook: component
depends_on:
- SET-006
- PLT-011
platforms:
- web
---

# SET-008 — AI Provider & Model Connections

Parent: [[SET-001 — Settings Surface & Scope Navigation]]

## Purpose

Defines how Relic exposes managed AI and future BYOK/local connections without leaking
provider complexity into ordinary Librarian use.

## Relic AI — active

Default experience:

**Relic AI**
`Managed automatically`

Internally Relic may route tasks through LiteLLM/provider/model aliases, but ordinary
users should not need to select a model per task.

## Provider independence

The GM interacts with **Relic / the Librarian**, not Claude/GPT/Gemini as product modes.

Changing/failing over a provider cannot change:
- RLS/permissions;
- semantic capability registry;
- authority;
- proposal/settlement rules;
- protected actions.

## BYOK — deferred implementation

Future provider connections may include supported services such as:
- OpenAI;
- Anthropic;
- Google;
- other providers supported through the runtime.

Requirements:
- secrets stored securely server-side;
- secrets never returned to ordinary clients;
- independently revocable;
- provider/cost routing changes only;
- no broadened Librarian authority.

Exact provider list is implementation-time configuration, not a hard product guarantee.

## Local models — deferred implementation

Future local connections may support compatible local runtimes.

Local capability is task-qualified.

A connected model does not automatically qualify for every:
- reasoning task;
- tool-planning task;
- structured-output workflow;
- Settlement pipeline.

Relic should communicate unsupported capabilities rather than silently degrading trust.

## AI source versus authority

Keep separate:

**Who powers AI**
- Relic AI;
- BYOK;
- Local.

**What AI may do**
- Supervised;
- Semi-autonomous;
- Autonomous.

Switching one never silently changes the other.

## Explicit exclusions

Do not initially expose:
- per-task model selector;
- temperature;
- reasoning effort;
- token budget;
- prompt editor;
- model routing graph.

These are runtime concerns.

## Relationships

- [[SET-006 — Librarian Authority & Review Policy]]
- [[SET-007 — Usage Credits & AI Activity]]
- future backend/provider routing

## Handoff

Implement Relic AI configuration now. Treat BYOK and local-model UI as deferred
sub-capabilities behind the same stable connection contract.
