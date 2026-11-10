---
id: LBR-009
status: active
kind: behavior
authority: current
system: SYS-13
family: agent-runtime-authority
storybook: none
depends_on:
- LBR-013
- REV-009
- LBR-011
---

# LBR-009 — Intent, Authority & Autonomy Gate

Parent: [[SYS-13 — Librarian]]

## Purpose

Determines what the GM actually authorized and what the Librarian may execute or settle under the current autonomy policy.

## Action classes

**A — Read / Navigate**
Execute directly.

**B — Reversible Workspace / Session Composition**
Execute directly with receipt/Undo.

**C — Explicit GM-authored Semantic Command**
A clear GM instruction can count as direct authorization even in Supervised mode. Example: `Mara now owes Seraphine a debt. Add that relationship.` Commit with GM-instruction provenance and correction support.

**D — AI-authored / Inferred Semantic Content**
In Supervised mode remains proposed.

## Mixed requests

Preserve the distinction between GM-specified facts and AI-created embellishment. Split or preview when necessary to avoid silently laundering generated detail into GM-authored fact.

## Protected actions

Always conspicuous: identity merge, destructive delete, historical retcon, major scope migration, destructive replacement, permission/publication changes, ambiguous identity resolution.

## Autonomy

Supervised waits on AI-authored/inferred canon; Semi-autonomous may settle eligible routine changes; Autonomous may settle broader eligible changes. Protected operations remain gated.

## Authority versus initiative

Autonomy controls **authority**, not permission to invent arbitrary work. Self-initiation is separately governed by [[LBR-013 — Human-Initiated Agentic Work]].

## Relationships

- [[REV-009 — Settlement Policy & Review Style]]
- [[LBR-013 — Human-Initiated Agentic Work]]
- [[LBR-011 — Proposal, Preview & In-Place Editing]]

## Handoff

Build **LBR-009 — Intent, Authority & Autonomy Gate** so the Librarian acts like an operator for explicit GM intent while preserving proposal safeguards for AI-invented semantics.
