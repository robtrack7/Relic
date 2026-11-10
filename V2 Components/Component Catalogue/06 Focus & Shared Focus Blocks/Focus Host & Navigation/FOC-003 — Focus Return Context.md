---
id: FOC-003
status: active
kind: behavior
authority: current
system: SYS-06
family: focus-host-navigation
storybook: none
depends_on:
- DSK-027
- OBJ-015
- DS-FOC
---

# FOC-003 — Focus Return Context

Parent: [[FOC-001 — Focus Host]]

## Purpose

Restores the GM to the exact useful context from which Focus or the Entity Builder was opened rather than treating either surface as a separate navigation branch.

## Interaction

Capture origin state when Focus opens.

**From Board**
Restore:
- Board identity;
- source Placement;
- selection;
- viewport position/zoom;
- local disclosure state where still valid.

**From Stage**
Restore:
- Stage Workspace State;
- Stage Canvas context;
- selected Stage Bubble/entity;
- Encounter Flow/current participant context unchanged;
- Stage Carriage state.

**From Prepare**
Restore:
- Session;
- relevant Prepare section;
- selected/pinned item state.

**From Library**
Restore:
- Library scroll/position;
- filters/search state;
- selected collection context.

**From Search**
Restore:
- query;
- selected result;
- result overlay state where appropriate.

**From Chronicle**
Restore:
- story position;
- selected Event/Thread;
- temporal lens context.

## Boundaries

Return state is presentation/context memory, not canon.

If the original item or Placement no longer exists, restore the nearest valid parent context and explain the missing reference only when necessary.

Focus provides local Back/Forward controls and Alt+, / Alt+. shortcuts. Each visit retains persistent object identity, originating Placement, section, scroll position, and disclosure context. Unfinished or failed drafts survive inspection navigation. Branching from an earlier visit replaces its forward trail.

These controls do not intercept browser navigation or move the Canvas camera. Closing the dock restores the originating selection and keyboard focus where valid. Historical entry points must retain their Story Position; the Desk inspection trail currently operates in Now.

When Entity Builder opens from Focus or Library, capture the originating page/selection and return context. Closing Builder restores that Focus page or Library position without changing Canvas framing. Builder and Focus share the entity draft session, so acknowledged autosaves and recoverable failed drafts survive the handoff.

## Relationships

- [[DSK-027 — Focus Invocation]] — Board-specific entry.
- [[OBJ-015 — Object Reference Navigation]] — non-Board entry.
- Stage, Prepare, Library, Search, Chronicle systems — origin contexts.
- [[FOC-013 — Entity Builder Host]] — preserves Builder entry and return context.

## Handoff

Implement **FOC-003 — Focus Return Context** as the context-preserving return behavior for every Focus and Entity Builder entry path.
