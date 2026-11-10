---
id: SYS-02
status: active
kind: system
authority: current
system: SYS-02
storybook: none
---

# SYS-02 — Desk & Boards

The Desk is Relic's default spatial working environment. The Canvas renders remembered Board compositions of persistent World Objects plus composition-only material. This folder owns spatial interaction, Board composition, and Desk-specific chrome; World Object content, Focus internals, Librarian internals, and Stage internals remain in their own systems.

## Locked tool model

The persistent Canvas Tool Cluster contains:

- **Select** — ordinary manipulation.
- **Create** — persistent World material.
- **Compose** — Board-only Sections, annotations, decorative connectors/arrows, and Board links.
- **Connect** — semantic Relationships, including multi-selected-sources-to-one-target batch connection.

Decorative connectors and semantic Relationships are intentionally separate.

## Catalogue

### Boards

- [[BRD-001 — Board Context Popover]]
- [[BRD-002 — Board Preview Tile]]
- [[BRD-003 — Create Board]]
- [[BRD-004 — Board Actions Menu]]
- [[BRD-005 — Board Open & Restore]]
- [[BRD-006 — Placement Host]]
- [[BRD-007 — Board Section]]
- [[BRD-008 — Board Annotation]]
- [[BRD-009 — Board Link Card]]
- [[BRD-010 — Move or Copy to Board Picker]]
- [[BRD-011 — Board Preview Renderer]]

### Canvas Core

- [[DSK-001 — Desk Surface]]
- [[DSK-002 — Canvas Viewport]]
- [[DSK-003 — Canvas Background & Dot Grid]]
- [[DSK-004 — Canvas Camera Navigation]]
- [[DSK-005 — View Controls]]
- [[DSK-006 — Canvas View Options]]
- [[DSK-026 — Semantic Zoom]]
- [[DSK-030 — Empty Board Prompt]]
- [[DSK-031 — Contextual Minimap]]
- [[DSK-033 — Pinned Reference Shelf]]

### Canvas Tools

- [[DSK-007 — Canvas Tool Cluster]]
- [[DSK-008 — Create World Material Menu]]
- [[DSK-009 — Composition Tool Menu]]
- [[DSK-010 — Blank Canvas Quick Capture]]
- [[DSK-011 — Paste & Drop to Canvas]]
- [[DSK-012 — Semantic Connect Interaction]]
- [[DSK-013 — Semantic Connection Handles]]
- [[DSK-014 — Decorative Connector Tool]]
- [[DSK-015 — Decorative Connector Edge]]

### Selection Placement

- [[DSK-016 — Selection Toolbar]]
- [[DSK-017 — Canvas Selection Model]]
- [[DSK-018 — Selection Marquee]]
- [[DSK-019 — Selection Frame & Handles]]
- [[DSK-020 — Placement Drag]]
- [[DSK-021 — Placement Resize & Disclosure]]
- [[DSK-022 — Alignment & Snap Guides]]
- [[DSK-023 — Multi-Selection Arrange Menu]]
- [[DSK-024 — Placement Context Menu]]
- [[DSK-025 — Canvas Context Menu]]
- [[DSK-027 — Focus Invocation]]
- [[DSK-028 — Canvas Undo & Redo]]
- [[DSK-029 — Canvas Proposal Layer]]
- [[DSK-032 — Canvas Keyboard & Spatial Navigation]]
