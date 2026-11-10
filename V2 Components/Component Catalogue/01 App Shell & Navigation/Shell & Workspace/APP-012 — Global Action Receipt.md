---
id: APP-012
status: active
kind: component
authority: current
system: SYS-01
family: shell-workspace
storybook: component
depends_on:
- PLT-004
- LBR-001
- REV-004
platforms:
- web
---

# APP-012 — Global Action Receipt

Parent: [[APP-001 — Global App Shell]]

## Purpose

Global Action Receipt briefly communicates the result of a meaningful product action and, where supported, provides coherent Undo.

It gives the GM confidence about what Relic just changed without creating a generic notification centre.

## Context & placement

Lives in screen space near the lower central edge of the usable workspace, offset as needed to avoid docked carriages and surface-specific controls.

It floats above the active surface and never changes viewport geometry.

Only one primary receipt should demand attention at a time.

## Use

Examples:

- `3 characters moved to Harbour Board · Undo`
- `Relationship added · Undo`
- `8 items grouped · Undo`
- `Session changes settled`

It is especially important for:

- Librarian actions;
- multi-object actions;
- settlement decisions;
- actions whose effect may not be immediately visible.

Trivial autosaves, every keystroke, and routine navigation should not produce receipts.

## Anatomy

- concise description of what occurred;
- optional count/object reference;
- Undo when available;
- optional compact failure/retry treatment for an operation that could not complete.

Avoid icons/status labels unless they improve comprehension.

## Appearance & behaviour

Small editorial strip/card with strong plain-language confirmation.

Should enter and leave quietly.

Undo remains available for a reasonable period, but the receipt itself should not permanently occupy the viewport.

If another meaningful action occurs, the newest receipt can replace the previous visible one; deeper action history/undo infrastructure is handled elsewhere.

## States & variants

- success;
- undoable success;
- undone;
- failure/retry;
- action still resolving when a visible receipt is genuinely useful.

## Relationships

- [[APP-001 — Global App Shell]] — owns screen-space mounting region.
- [[PLT-004 — Temporal State & Change-Set Transaction Engine]] — provides conceptual operation/undo identity.
- [[LBR-001 — Librarian Carriage]] — may initiate actions confirmed here.
- [[REV-004 — Session Change Set & Story Changes]] — may produce receipts.

## Data / utility relationship

Consumes product-level operation results and optional undo handles.

It does not determine how actions are committed or reversed.

## Handoff

Build **APP-012 — Global Action Receipt** as the transient plain-language confirmation/Undo component for meaningful Relic actions.
