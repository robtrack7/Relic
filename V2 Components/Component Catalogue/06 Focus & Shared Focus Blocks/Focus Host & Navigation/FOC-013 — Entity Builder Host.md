---
id: FOC-013
status: active
kind: surface
authority: current
system: SYS-06
family: focus-host-navigation
storybook: scene
depends_on:
- FOC-001
- FOC-003
- FOC-004
- FOC-008
- APP-010
- OBJ-001
platforms:
- web
---

# FOC-013 — Entity Builder Host

Parent: [[SYS-06 — Focus & Shared Focus Blocks]]

## Purpose

Entity Builder is Relic's central authoring workspace for creating and developing one persistent World Object. It is distinct from the right-side Focus carriage: Focus explores and contextually edits; Builder creates, writes, and arranges supported authored blocks at depth.

## Context & placement

Builder opens from Library, Focus, or an explicit create action without requiring a Board Placement. It is bound to one world/object identity and uses the shared versioned `EntityDocument`, identity projection, mechanics profile, relationships, and provenance rather than a copied record.

When measured space permits, Builder remains central while Focus stays visible as a live preview. When the pair cannot fit, Builder receives priority and Focus remains available through an explicit panel switch. The Desk, Canvas coordinates, Stage, and Librarian drafts remain mounted or recoverable through [[APP-010 — Workspace Dock Manager]].

## Authoring model

The Builder presents a readable document column with quiet block boundaries and controls associated with the active block. Supported blocks may be added, named, collapsed, reordered, and edited with keyboard alternatives to drag interactions. Narrative, roleplay, goals, notes, media, mechanics, relationships, and sources use their appropriate editors; family Focus pages curate the same material rather than mirroring Builder order.

Rich prose uses the constrained shared editor and reading renderer. Inline entity references are navigational content only and never create a semantic Relationship. Relationship, assertion, mechanics, provenance, template, and historical operations remain explicit validated actions with stable targets and observed versions.

## Draft and collaboration boundary

Focus and Builder share one entity-scoped draft session. Ordinary writing and block arrangement autosave after a short idle period with Saving/Saved/error, retry, and conflict recovery states. Failed drafts survive navigation and reload through local recovery. Consequential operations are never silently converted into prose autosaves.

Future Librarian proposals target the same validated operations and stable block IDs; there is no separate AI document format or autonomous authoring path.

## Navigation

Closing Builder restores the originating Focus page or Library position, selection, and keyboard context where valid. Opening another entity is deliberate and preserves the previous draft. Creating an entity does not place it on a Board.

## Handoff

Build **FOC-013 — Entity Builder Host** as the central, identity-bound authoring surface that shares documents and drafts with Focus while preserving the spatial workspace and explicit semantic operations.
