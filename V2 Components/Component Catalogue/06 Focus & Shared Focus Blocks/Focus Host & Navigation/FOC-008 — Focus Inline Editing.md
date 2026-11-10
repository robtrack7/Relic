---
id: FOC-008
status: active
kind: behavior
authority: current
system: SYS-06
family: focus-host-navigation
storybook: pattern
depends_on:
- FOC-011
- OBJ-012
- DS-FOC
platforms:
- web
---

# FOC-008 — Focus Inline Editing

Parent: [[FOC-001 — Focus Host]]

## Purpose

Makes Focus a living editable knowledge surface rather than a read-only view that switches into a giant form. Deep creation, block naming, ordering, and extended authoring remain in [[FOC-013 — Entity Builder Host]].

## Interaction

Content is edited where it is read.

Examples:
- click narrative prose to edit;
- edit a Character name inline;
- choose current location from an object picker;
- add/edit a Relationship inside Relationships Block;
- add Knowledge inside Knowledge & Beliefs Block;
- edit a Mechanics Field directly;
- type GM Notes directly in the GM Notes block.

Use the interaction appropriate to the content rather than one universal text editor.

## Behaviour

- optimistic/local updates where safe;
- ordinary authored sections use a shared entity draft with acknowledged autosave after a short 650ms idle period; Saving/Saved/error and retry/recovery remain visible;
- name edits commit with Enter, F2 starts rename, and substantive prose/mechanics controls use contextual formatting rather than a permanent toolbar;
- close an editor only after its validated save is acknowledged; failed drafts remain editable and survive Focus navigation;
- autosave is limited to ordinary authored writing and block arrangement with an equally clear acknowledgement/recovery contract;
- explicit state only when saving/recovery matters;
- Escape cancels the active field edit where possible;
- keyboard commit follows control semantics;
- focus/selection returns sensibly after commit.

Dangerous semantic operations remain explicit and may require confirmation. An unchanged assertion edit is a no-op; clearing a settled assertion uses the explicit Withdraw action rather than silently removing it through an empty revision.

## Boundaries

No global `Edit Object` mode.

Historical/as-of editing is constrained by [[FOC-011 — Focus Temporal Context]] so the GM cannot accidentally overwrite Now while viewing the past.

Permissions and GM/player separation are enforced below the UI.

## Relationships

- [[OBJ-012 — Inline Object Rename]] — shared name-edit pattern.
- shared Focus Blocks — provide block-specific editing interactions.
- [[FOC-011 — Focus Temporal Context]] — historical editing boundary.

## Handoff

Implement **FOC-008 — Focus Inline Editing** as contextual, acknowledged, recoverable editing throughout Focus rather than a page-wide edit mode. Consequential semantic operations remain explicit validated actions.
