---
id: REV-007
status: active
kind: component
authority: current
system: SYS-12
family: workspace-review-ui
storybook: component
depends_on:
- REV-004
- REV-008
- REV-013
- DS-TRUST
platforms:
- web
---

# REV-007 — Change Detail & Inline Edit

Parent: [[REV-002 — Session Settlement Workspace]]

## Purpose

Provides precise semantic before/after inspection and direct correction without forcing the GM to navigate away from Settlement.

## Presentation

Show human semantics, not JSON/database patches.

Examples:

**Allegiance**
`Independent → Crown-aligned`

**Thread**
`Active → Resolved`

**Relationship**
`+ Mara is a member of The Crown`

**Narrative**
before / proposed text.

**New object**
proposed identity + key fields.

## Inline editing

The GM can directly modify the proposed interpretation.

Actions:
- Save correction;
- Settle / Edit & Settle where approval is required;
- Reject;
- inspect evidence;
- switch to World Preview.

Manual correction becomes the reviewed payload and preserves a before/proposed/final diff.

## Story-level correction

Editing one field may imply dependent Story Change updates.

The UI can suggest updating related mutations, while the Librarian can revise the Story Change coherently.

Never silently rewrite unrelated settled history.

## Relationships

- [[REV-004 — Session Change Set & Story Changes]]
- [[REV-008 — Evidence & Transcript Inspector]]
- [[REV-013 — Settlement Librarian Context Bridge]]

## Handoff

Build **REV-007 — Change Detail & Inline Edit** as the precise manual correction surface under Summary-first settlement.
