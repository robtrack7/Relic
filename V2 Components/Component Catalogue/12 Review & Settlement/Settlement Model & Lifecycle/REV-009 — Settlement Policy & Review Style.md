---
id: REV-009
status: active
kind: behavior
authority: current
system: SYS-12
family: settlement-model-lifecycle
storybook: pattern
depends_on:
- SET-006
- REV-010
platforms:
- web
---

# REV-009 — Settlement Policy & Review Style

Parent: [[SYS-12 — Review & Settlement]]

## Purpose

Separates **how much authority AI has to settle world changes** from **how much detail the GM wants to inspect**, allowing effortless workflows without sacrificing trust.

## Settlement policy / autonomy

**Supervised**
Relic builds the complete proposed Session interpretation. Nothing eligible becomes settled canon until the GM gives explicit settlement intent.

Summary-first can satisfy this with one clear `Settle Session` action rather than per-field approvals.

**Semi-autonomous**
Routine, well-supported, non-protected changes may settle automatically. Ambiguous/conflicting/protected changes remain Needs Attention.

**Autonomous**
Eligible changes may settle automatically. The GM receives a World Updated summary and can inspect/correct/revert anything. Protected operations remain gated as defined by policy.

## Review style

Separate preference:

**Summary-first**
Default.
- Session story;
- Settlement Canvas;
- Needs Attention;
- one Session-level action where approval is required.

**Detailed**
- Story Changes expanded;
- field-level diffs;
- individual settle/reject/edit controls;
- evidence nearer to the surface.

Authority and Review Style are independent.

## Auto-settlement eligibility

Do not use raw model self-confidence as authority.

Eligibility can consider:
- direct/strong evidence;
- identity resolution quality;
- no contradiction/conflict;
- safe mutation class;
- temporal validity;
- provenance;
- protection policy;
- user/Saga configuration.

## Explicit intent

In Supervised mode, settlement requires explicit GM intent through:
- a deliberate UI action;
- or an explicit Librarian command such as `Settle this Session`.

Do not infer approval from conversational tone.

## Settings ownership

The default autonomy policy and Review Style for a Saga are configured through
[[SET-006 — Librarian Authority & Review Policy]].

Changing personal defaults later must not silently change an existing Saga's policy.

## Relationships

- [[REV-010 — Exceptions, Conflicts & Protected Changes]]
- Librarian autonomy system
- Settings / AI Configuration

## Handoff

Implement **REV-009 — Settlement Policy & Review Style** so Summary-first Supervised is effortless by default while Semi-autonomous/Autonomous support review-by-exception.
