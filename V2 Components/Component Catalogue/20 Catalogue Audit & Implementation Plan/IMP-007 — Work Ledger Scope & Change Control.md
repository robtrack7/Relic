---
id: IMP-007
status: active
kind: reference
authority: implementation
system: SYS-20
storybook: none
depends_on:
- IMP-002
- IMP-006
---

# IMP-007 — Work Ledger Scope & Change Control

## Catalogue versus work state

The catalogue is a durable product/design contract. Do not pollute it with sprint/project-manager state.

Dynamic implementation state belongs in GitHub/issues/a tiny work ledger generated for the active effort, not in component frontmatter.

## Minimal active-work record

If a ledger is useful, one item only needs something like:
- catalogue target ID;
- implementation state (`queued`, `building`, `manual-review`, `integrated`, `blocked`, `done`);
- current code/story location;
- one-line blocker/decision if any.

Do not duplicate the component specification in the ledger.

## Scope selection

Choose work from [[IMP-002 — Implementation Build Sequence]] and the current vertical slice. Do not implement every sibling simply because it is catalogued.

`prototype` means the product answer should be tested/iterated, not that implementation must wait.

`deferred` means do not pull it into current work unless the GM explicitly reprioritizes it or an invariant requires a compatibility seam.

## Change control

- implementation-only change → code/test only;
- accepted current product/design change → smallest catalogue update through [[IMP-006 — Lightweight Documentation Sync]];
- invariant change → deliberate GM/product decision before registry update.

## Avoiding plan loops

Once the target, direct context and acceptance checkpoint are understood, build. Do not repeatedly regenerate plans because implementation details changed. Update the build sequence only when the actual dependency/order strategy materially changes.
