---
id: IMP-006
status: active
kind: reference
authority: implementation
system: SYS-20
storybook: none
depends_on:
- 00-AUTHORITY-POLICY
- 00-REG-SCHEMA
---

# IMP-006 — Lightweight Documentation Sync

## Goal

Keep the catalogue alive without letting documentation maintenance consume the primary implementation agent's context or tokens.

## End-of-task sync

After a meaningful implementation task, a lightweight model/agent (for example a Haiku/Luna-class worker) receives only:
- target catalogue ID(s);
- changed code/story files or concise diff summary;
- test/manual outcome;
- any explicit decision made during implementation.

It answers one question first:

> **Did the observable product/design/domain contract change?**

### If no

Do nothing to the catalogue.

Examples:
- hook refactor;
- SQL index optimization;
- component folder merge;
- cache implementation change that preserves contract;
- test cleanup.

### If yes — current decision

Update the **smallest affected target file(s)** and direct dependency/index metadata only. Do not rewrite entire systems or produce meeting-note prose.

### If invariant may have changed

Do not auto-edit the invariant. Return a short conflict note for the GM/main agent to decide.

## Mechanical maintenance

After a real catalogue change, run the cheap registry tooling:
- frontmatter/schema lint;
- duplicate-ID check;
- wikilink check;
- direct-dependency target check;
- regenerate Catalogue Index JSON;
- regenerate Storybook Inventory.

## Principle

Most implementation tasks should end with **zero documentation edits**. Documentation is synchronized to decisions, not to code churn.
