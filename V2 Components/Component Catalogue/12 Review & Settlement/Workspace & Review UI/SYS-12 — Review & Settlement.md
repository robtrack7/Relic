---
id: SYS-12
status: active
kind: system
authority: current
system: SYS-12
storybook: none
---

# SYS-12 — Review & Settlement

## Purpose

Owns the post-session trust loop: interpret what happened, show the resulting world change coherently, let the GM correct misunderstandings effortlessly, settle according to autonomy policy, and carry trusted state into the next Session.

## Core product law

Relic should not ask the GM to reconstruct the Session twice.

**Relic reconstructs it. The GM recognizes it, corrects it, and trusts it.**

## Workspace model

Primary settlement experience:

`Session Story Carriage | Settlement Canvas / Detail / Evidence | Librarian`

Default Review Style is Summary-first.

Detailed review remains available through progressive disclosure.

## Settlement model

- processing creates a Session Change Set;
- Story Changes group atomic mutations by narrative meaning;
- Supervised can settle a whole reviewed Session with one explicit action;
- Semi-autonomous settles eligible routine changes and surfaces exceptions;
- Autonomous can settle eligible changes automatically while preserving inspect/correct/revert;
- protected operations remain conspicuous.

## Trust model

Trust comes from:
- clear settled vs pending distinction;
- evidence/provenance;
- correction through Librarian or manual editing;
- recent-change temporal traces;
- complete audit;
- reversible Session Change Sets;
- protected-operation gating;
- no silent interpretation of Supervised approval.

## Catalogue

### Librarian Bridge

- [[REV-013 — Settlement Librarian Context Bridge]]

### Settlement Model Lifecycle

- [[REV-001 — Post-Session Processing Pipeline]]
- [[REV-002 — Session Settlement Workspace]]
- [[REV-003 — Session Story Carriage]]
- [[REV-009 — Settlement Policy & Review Style]]
- [[REV-010 — Exceptions, Conflicts & Protected Changes]]
- [[REV-011 — Session Material Resolution]]
- [[REV-014 — Revert, Correct & Audit]]
- [[REV-015 — Completion & Carry Forward]]

### Workspace Review Ui

- [[REV-004 — Session Change Set & Story Changes]]
- [[REV-005 — Settlement Canvas View]]
- [[REV-006 — Recent Change & Temporal Trace]]
- [[REV-007 — Change Detail & Inline Edit]]
- [[REV-008 — Evidence & Transcript Inspector]]
- [[REV-012 — Recap & Prep Implications]]
