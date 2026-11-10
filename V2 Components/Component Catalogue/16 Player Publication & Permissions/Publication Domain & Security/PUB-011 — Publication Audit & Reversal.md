---
id: PUB-011
status: deferred
kind: domain
authority: current
system: SYS-16
family: publication-domain-security
storybook: none
---

# PUB-011 — Publication Audit & Reversal

Parent: [[SYS-16 — Player Publication & Permissions]]

## Purpose

Preserves trustworthy publication history and supports revoking visibility without erasing what the GM previously published.

## Audit

Where relevant preserve:
- publication target;
- published object/artifact;
- selected blocks/preset;
- publisher;
- published at;
- originating Session where applicable;
- later publication changes;
- unpublish/revoke action.

## Unpublish semantics

Unpublish stops future authorized access.

It does not:
- delete the underlying World Object;
- rewrite the Chronicle;
- erase the publication audit.

## Object grants

For continuing World Object publication grants, later safe settled edits can continue to project unless the grant is changed/revoked.

## Versioned artifacts

For recaps/handouts, retain publication versions so editing history remains understandable.

## Handoff

Section 19 can decide storage/audit schema when player publication is implemented, preserving the semantics above.
