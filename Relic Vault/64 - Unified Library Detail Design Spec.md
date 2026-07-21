---
status: active
authority: secondary
scope: mvp-design
read_after:
  - "[[60 - Design Spec Overview]]"
depends_on:
  - "[[30 - Sanctum UX Flow]]"
  - "[[20 - Entity and Canon Schema]]"
  - "[[23 - AI Task Registry]]"
  - "[[34 - UI Implementation Spec]]"
  - "[[13 - Design System]]"
  - "[[72 - Navigation Design Spec]]"
supersedes: []
last_audited: 2026-07-21
source_file: "Relic Vault/64 - Unified Library Detail Design Spec.md"
---

> [!info] How to use this spec
> Use this for Sanctum Library and detail patterns across Characters, Places, Factions, Artifacts, Threads, Sessions, sources, and notes. Read with [[60 - Design Spec Overview]], [[72 - Navigation Design Spec]], and [[71 - Component Inventory Design Spec]]. Upstream behavior lives in [[30 - Sanctum UX Flow]], [[20 - Entity and Canon Schema]], and [[34 - UI Implementation Spec]].

# Unified Library Detail Design Spec

## 1. Purpose

The unified Library/detail surface lets the GM browse, filter, search, edit, link, archive, and inspect canon or draft-adjacent records inside The Sanctum. It covers entity, note, source, Thread, and detail editor patterns under the left-rail Library destination.

Threads deserve special weight inside this pattern because they are the continuity spine.

## 2. Page synthesis

This spec translates [[30 - Sanctum UX Flow]] entity, Thread, notes, and detail behavior into a shared screen pattern. It uses [[20 - Entity and Canon Schema]] canon states and source model, [[23 - AI Task Registry]] for invoked entity/stub assists, [[34 - UI Implementation Spec]] for component naming, and [[72 - Navigation Design Spec]] for the Library label and shell placement.

The goal is one coherent detail experience, not separate design languages per entity type.

## 3. User mental model

The GM thinks: "This is my Saga canon library. I can find a thing, understand what is true, edit it, see what connects, and follow its sources."

For Threads, the GM thinks: "This is what is unresolved or evolving." For notes, they think: "This is supporting lore or summary attached to canon."

## 4. Primary user jobs

- Browse records by type, status, canon state, tag, and scope.
- Open and edit a detail record with autosave.
- Create a new manual record or invoke AI to draft one.
- Follow backlinks, relationships, and mentions.
- See canon/draft/archived/stub state clearly.
- Work with Thread objectives and read-only Thread Timeline.
- Flesh out a stub from session evidence when allowed.

## 5. Primary action

Primary action depends on context:

- Library: `New character`, `New place`, `New faction`, `New artifact`, `New lore note`, or another type-specific create.
- Thread list: `New thread`.
- Detail: edit/autosave is primary background behavior; explicit primary action may be `Flesh out from session evidence` for eligible stubs or `Propose a complication` for Threads.

Avoid a Save button for ordinary edits. Autosave state must be visible.

## 6. Secondary actions

Secondary actions include filter, sort, archived toggle, source panel, relationship picker, mention acceptance, Draft from prompt, Propose thread complication, Flesh stub from evidence, archive, restore, hard-delete only where upstream allows, copy link, open in Stage if pinned/active, and jump to related Session or Thread.

## 7. Layout structure

Desktop library uses a list/detail or list-to-detail route pattern. Left: type/filter rail. Main: searchable list or detail editor. Optional right inspector: provenance, relationships, backlinks, warnings, draft/source detail.

Detail pages use a header with name, type, state chips, scope chip, last updated, and actions. Main body holds narrative/editor blocks. Side rail holds metadata, related entities, source/provenance, and relevant AI assist panels.

Mobile uses a single-pane list and detail route. Filters and provenance open as bottom sheets. Thread Timeline is accessible but web-preferred.

## 8. Key components

- Navigation: `TypeFilterRail`, `LibrarySearchBar`, `ScopeFilter`, `BreadcrumbBack`, `SearchInput`, `RelicGuideToggle`.
- Containment: `EntityList`, `EntityListItem`, `EntityDetailHeader`, `NarrativeEditorPanel`, `ThreadObjectiveLog`, `ThreadTimelineReadOnly`.
- Inputs: `InlineTitleField`, `RichTextEditor`, `TagInput`, `RelationshipPicker`, `EntityPicker`, `MentionSuggestionChip`.
- Trust/status: `CanonStateChip`, `ScopeChip`, `StubBanner`, `ArchivedBanner`, `SourceBadge`, `ProvenancePanel`.
- AI: `DraftFromPromptButton`, `EntityAssistMenu`, `ThreadComplicationButton`, `FleshStubCTA`.

See [[71 - Component Inventory Design Spec]].

## 9. Required states

Required states: empty library, no search results, loading list, loading detail, autosaving, saved, offline queued, validation error, permission/RLS denial, archived detail, stub detail, broken source, conflict on save, AI assist loading/failure, duplicate warning, timeline empty, Thread objective update saving, relationship target missing or archived.

Archived records must be recoverable and visually subdued. Hard-delete requires confirmation and should never be a primary action.

For MVP, hard-delete is available only for an archived, unreferenced record. The GM must first open the permanent-delete disclosure, check the irreversible-action confirmation, and type the record name exactly. Relationships, active suggested/accepted mentions, Note attachments, Session pins/active Thread usage, and pending drafts are blocking references. Intrinsic source and canon-audit history remain as tombstones after deletion; derived embeddings do not.

The D3 Thread detail specialization reuses this relationship contract. It exposes separate Failed and Resolved states with required explanations, stable orderable objectives with complete/reopen timestamps, Session carry-forward/pin history, and a chronological read-only evidence projection. Timeline rows show their audit/source kind and identifier; missing endpoints use an unavailable-record fallback and archived endpoints remain labeled.

## 10. AI behavior

AI is invoked by the GM through explicit buttons. Entity assists can draft from prompt where the owning task exists. Thread complication generates ephemeral cards that the GM may copy into narrative. Stub fleshing creates an update draft routed through the approval write path.

AI must not auto-link mentions or auto-create relationships. Mention suggestions are accepted or dismissed by the GM.

Exact-name mention detection may create a suggestion after an ordinary save, but it never creates a relationship or canon mutation. Dismissal snoozes the suggestion for seven days; acceptance creates the visible backlink state. Both choices remain reversible from the detail surface.

## 11. Source/provenance behavior

Every detail page needs source/provenance access, but not every field needs visible citations by default. Use source badges and an inspector panel. Draft or AI-assisted sections need stronger source presence.

For stubs, show why the stub exists and what evidence allows fleshing. For Threads, show session-pin history, objective changes, and timeline markers as derived/read-only.

## 12. Navigation in

Users arrive from the Library rail item, dashboard recent canon, search result, Relic Guide citation, Approval Queue target, prep pinned entity picker, Stage read-only open, or notification/deep link.

## 13. Navigation out

Users can navigate to related Library records, related Threads, Sessions, Approval Queue drafts, source transcript segments, prep editor, Stage preview, or back to Library filters.

## 14. Components to avoid

Avoid relationship graph visualization, writable timeline editor, map editor, player-visible controls, stat-block-heavy game system panels, initiative/encounter widgets, automatic AI relationship creation, and permanent chatbot columns.

## 15. Visual tone

Literary, modern, relaxing reference library with editorial detail. Names and lore should feel authored, but controls should stay practical. Threads use stronger continuity state language with Verdigris/Amber/Stone chips.

## 16. Claude Design prompt

```text
Create Relic's unified Sanctum Library and detail pattern for web and mobile. Make it literary, modern, and relaxing. Include type/filter rail or sheet, current Saga plus World canon scope filters, search, Library record list, and detail editor with autosave. Detail header shows type, canon state, scope, stub/archive state, and source access. Include Thread-specific objectives and read-only timeline entry, plus GM-invoked AI buttons for draft from prompt, propose thread complication, and flesh stub from evidence. Use Relic editorial parchment styling. Exclude relationship graphs, writable timeline editors, map editors, player controls, initiative/encounter widgets, and permanent chat columns.
```
