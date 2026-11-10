---
id: BRD-007
status: active
kind: component
authority: current
system: SYS-02
family: boards
storybook: component
depends_on:
- DSK-023
- DSK-015
- BRD-006
- DS-CAN
platforms:
- web
---

# BRD-007 — Board Section

Parent: [[DSK-009 — Composition Tool Menu]]

## Purpose

Provides a visible spatial region for grouping Board material without asserting that the grouped objects share a canonical Place, Faction, Thread, or other semantic relationship.

## Context & placement

Lives in the composition layer shared by Desk, Boards, and Prepare. “Board-only” means
that the Section is presentation composition, not semantic world ownership; it does not
exclude the Desk’s shared Canvas.

A Section has canvas position and dimensions and contains a lightweight collection of
stable Placement IDs. Membership has no World Object or semantic-link meaning.

Initial implementation should avoid nested Sections and empty collections. Empty
collections are pruned; one level keeps movement and containment understandable.

## Anatomy

- quiet region boundary/background;
- editable title;
- optional short caption;
- resize handles when selected;
- contained Placement count only when useful.

Examples:
- `The Northern Kingdoms`
- `Session 12 possibilities`
- `Needs work`
- `Villains`

## Appearance & behaviour

Visually lighter than World Object cards.

A Section should feel like a sheet, bracket, or editorial region under the material rather than another card. It opens as a Section and may collapse into a layered Stack projection.

Collapsing preserves authored expanded coordinates; it changes only the projection. Browsing or reordering a collapsed Stack brings the chosen member to the front. Dragging the Section header or its hover/focus perimeter moves its members as one composition operation. A card remains independently draggable after whole-collection selection.

Expanded collections use a fine dashed boundary with a transparent interior. A stable collapsed anchor prevents insertion from moving existing members. Deliberate whole-collection movement translates that anchor as well as the authored placements. Optional Arrange expands into a nonoverlapping layout using measured footprints, preserving intentional dimensions and an undo path to the prior arrangement.

Dragging a Placement into or out of a Section performs an atomic, versioned membership-and-move operation. Membership references Placement IDs and does not create semantic links or truth.

Section title editing is direct and lightweight.

Keyboard users can group and ungroup with the same composition semantics; arrow keys move the selected Section or member. F2 edits a focused Section title; E expands or stacks the collection.

The current collection slice derives region bounds from its member Placements. Explicit region resizing remains an implementation gap.

## States & variants

- untitled;
- titled;
- selected;
- resizing;
- moving with contents;
- collapsed as a layered Stack;
- keyboard group/ungroup and title-editing states.

## Relationships

- [[DSK-009 — Composition Tool Menu]] — creation entry.
- [[DSK-023 — Multi-Selection Arrange Menu]] — create Section around selection.
- [[DSK-015 — Decorative Connector Edge]] — may anchor to Section.
- [[BRD-006 — Placement Host]] — contained world placements.

## Data / utility relationship

Stored only in the shared presentation-composition layer. Section membership has no
semantic meaning outside that composition.

## Handoff

Build **BRD-007 — Board Section** as the lightweight titled composition region that can move and organize contained Placements without creating canon.
