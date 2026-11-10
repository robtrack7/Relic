---
id: SGA-003
status: active
kind: component
authority: current
system: SYS-15
family: entry-empty-desk
storybook: component
depends_on:
- SGA-002
- DSK-001
platforms:
- web
---

# SGA-003 — First Desk Empty State & Starting Actions

Parent: [[SYS-15 — Saga Creator & First Run]]

## Purpose

Uses the normal Desk itself as first run, in the same spirit as other canvas tools: the workspace is immediately live and the starting options are lightweight affordances, not a wizard.

## Core rule

After [[SGA-002 — World & Mechanics Setup]], open [[DSK-001 — Desk Surface]] directly. Do not show a separate `Choose how to start` screen.

## Empty-state treatment

Keep the Canvas visibly usable. A restrained prompt can say:

**Your Saga begins here.**

`Use the Canvas tools to build freely, bring material you already have, or work with the Librarian.`

Useful actions:
- Create
- Bring material
- Open Librarian
- Prepare Session 1

## Manual path

The GM may ignore every helper and immediately use Select / Create / Compose / Connect / Focus / Boards. Manual creation is not a fallback.

## AI boundary

Displaying the empty state, opening Librarian, selecting tools, or creating manually makes **no model call**. AI work begins only after a submitted Librarian request or explicit assisted workflow.

## Lifecycle

The helper fades/disappears as meaningful material appears. It does not become a checklist or required onboarding state.
