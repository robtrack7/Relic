---
id: IMP-003
status: active
kind: reference
authority: current
system: SYS-20
storybook: none
depends_on:
- SYS-18
- DS-SCN
- 00-AUTHORITY-POLICY
---

# IMP-003 — Storybook-First UI Workflow

## Purpose

Make every reusable visual component inspectable and adjustable before it becomes buried inside a full surface.

## Normal component workflow

1. Identify the exact catalogue target.
2. Read its Storybook/design dependencies only.
3. Implement the smallest real component API that supports its authored states.
4. Create stories with realistic Relic fixtures/copy.
5. Manually inspect default + important edge/interaction states.
6. Adjust component/spec when actual use exposes a better `current` answer.
7. Add lightweight automated interaction/a11y coverage once behavior is understood.
8. Integrate into the first real consumer.
9. Re-test in the integrated surface/reference scene.

## Story categories

**Primitive** — token/icon/divider/foundation specimen.

**Component** — independently reusable/rendered UI such as Button, Card, row, Field, Menu.

**Pattern** — interaction/behavior requiring composed state, such as autosave, overlay dismissal, protected action, semantic connect.

**Scene** — integrated reference/workspace composition used as a visual/product coherence test.

## Fixture policy

Use a small coherent fictional Saga and typed fixtures reused across stories. Avoid lorem ipsum. Fixtures should be easy to construct without Supabase so rare/error/pending/historical states are always reachable.

Story fixtures are not a second domain model. They should instantiate the same public component/domain contracts with mock adapters.

## Design progression

`foundation → atom/control → domain component → interaction pattern → reference scene → real surface`

Do not finish all primitives before trying domain components; iterate between levels. Reference scenes exist to send corrections back down the system.

## Visual authority

During active design, approved Storybook stories are the living visual reference. Exact visual tokens remain `current`, not invariant. If integrated use proves the story wrong, fix the system rather than adding local CSS exceptions.

## Storybook is not the product specification

Storybook owns reproducible rendered states. The catalogue owns meaning/behavior. Production code owns implementation. Keep those roles separate.
