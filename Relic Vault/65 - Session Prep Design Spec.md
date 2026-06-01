---
status: active
authority: secondary
scope: mvp-design
read_after:
  - "[[60 - Design Spec Overview]]"
depends_on:
  - "[[31 - Session Prep Flow]]"
  - "[[30 - Sanctum UX Flow]]"
  - "[[32 - Stage UX Flow]]"
  - "[[23 - AI Task Registry]]"
  - "[[13 - Design System]]"
  - "[[72 - Navigation Design Spec]]"
supersedes: []
last_audited: 2026-06-01
source_file: "Relic Vault/65 - Session Prep Design Spec.md"
---

> [!info] How to use this spec
> Use this for the inline dashboard prep workspace and full prep editor route. Read with [[60 - Design Spec Overview]], [[72 - Navigation Design Spec]], and [[71 - Component Inventory Design Spec]]. Upstream behavior lives in [[31 - Session Prep Flow]], [[30 - Sanctum UX Flow]], [[32 - Stage UX Flow]], and [[23 - AI Task Registry]].

# Session Prep Design Spec

## 1. Purpose

Session prep turns current Saga canon, active Threads, loose consequences, pinned entities, and GM notes into a runnable Session Packet for The Stage.

Prep is a workflow inside The Sanctum. It is reached through the `Prepare` rail item, dashboard next-action cards, Sessions, and the current session pill. It is not a separate product surface.

## 2. Page synthesis

This screen combines [[31 - Session Prep Flow]] workspace layout and packet rules, [[30 - Sanctum UX Flow]] inline dashboard behavior, [[32 - Stage UX Flow]] packet consumption, and [[23 - AI Task Registry]] prep tasks.

There are two presentations of the same data: inline dashboard prep for quick continuation and a full editor route for deep prep. Both write to the same session fields.

## 3. User mental model

The GM thinks: "I am getting next session ready to run. I need objective, opening scene, active Threads, pinned references, and a short checklist."

They expect AI to help only when asked, and they expect the final packet to be exactly what Stage will show.

## 4. Primary user jobs

- Create or continue a planned session.
- Edit objective, opening scene, scene notes, prep checklist, active Threads, and pinned entities.
- Review a canon-only prep briefing.
- Carry forward active and loose Threads.
- Use Relic Guide or explicit AI actions to draft prep, brainstorm beats, suggest an NPC, or prepare GM-reviewed edits.
- Preview the Stage packet and mark Ready for Stage.

## 5. Primary action

`Ready for Stage` is the primary action when session completeness is sufficient. Before that, the primary action may be `Draft this session` if the GM has not yet prepared content and chooses AI help, but it must not outrank manual editing.

After Ready, the primary action becomes `Open in Stage`.

## 6. Secondary actions

Secondary actions include Open full editor, Refresh briefing, Brainstorm beats, Draft an NPC, Add pinned Library record, Create quick stub, Add checklist item, Open Thread, Open Library detail, open Relic Guide, Reset prep, Duplicate as new planned, Archive session, and return to dashboard.

Destructive or broad actions belong in an actions menu.

## 7. Layout structure

Inside the Sanctum shell, use Parchment base with Amber-forward prep accents. Desktop full editor can use a main agenda column, context rail, and collapsible Relic Guide sidecar. The context rail contains briefing, active/loose Threads, pinned entities, recent canon changes, packet preview, and readiness.

Inline dashboard version is more compact: briefing, Thread carry-forward, agenda preview, pinned entities, checklist, Ready for Stage. Full editor expands each section and shows richer suggestion history.

Mobile stacks all sections and uses bottom sheets for entity picker, source view, and Relic Guide results/actions.

## 8. Key components

- Containment: `PrepWorkspace`, `PrepBriefingCard`, `AgendaEditor`, `ActiveThreadsPanel`, `PinnedEntitiesPanel`, `SessionPacketPreview`, `ReadyForStagePanel`.
- Inputs: `ObjectiveField`, `OpeningSceneField`, `SceneNotesField`, `ChecklistEditor`, `PinnedEntityPicker`, `ThreadPicker`.
- Actions: `DraftThisSessionButton`, `BrainstormBeatsButton`, `DraftNpcButton`, `ReadyForStageButton`, `OpenStageButton`.
- Trust/status: `PrepSourceStamp`, `PendingReviewWarning`, `ArchivedPinnedEntityBanner`, `PrepLockedBanner`, `QuotaWarningCard`.
- AI: `RelicGuideSidecar`, `PrepSuggestionCards`, `SceneBeatCards`, `NpcCandidateCards`, `InlineReviewCard`.

See [[71 - Component Inventory Design Spec]].

## 9. Required states

Required states: first session from scaffold, blank first session, no prior sessions, prior session pipeline pending, planned session, ready session, started session, in-progress read-only lock, ended-pending-undo read-only lock, archived pinned entity warning, empty active Threads, loading briefing, briefing unavailable, AI task loading/failure/quota-blocked, offline queued edits, packet incomplete, Ready success, Stage open failed.

Manual editing must remain available when AI fails or quota blocks a task.

## 10. AI behavior

AI behavior is mostly GM-invoked:

- `Draft this session` invokes prep synthesis.
- `Brainstorm beats` returns ephemeral beat cards.
- `Draft an NPC` returns candidates, then selected candidate routes through entity draft review.
- AI Quick Stub writes only after inline review and Pin.
- Relic Guide can prepare session edits, create quick stubs, or draft Library changes, but applies them only after GM preview. Canon-impacting changes use inline GM-reviewed commit or Approval Queue.

The prep briefing is the visible exception: it may compose on prep load, but it is canon-only, cached, source-stamped, and not a proposal. No AI runs during active Stage.

## 11. Source/provenance behavior

Prep briefing shows composed time and source count. AI-generated suggestions show source badges and rationale. Pending prior pipeline warning should link to Approval Queue and state that briefing uses canon only.

Accepted prep suggestions update session working state, not canon entity truth unless they pass through a documented inline review/synthetic approval path.

## 12. Navigation in

Users arrive from the Prepare rail item, dashboard primary CTA, current session pill, Sessions index, Plan Session 1 card, Approval Queue completion, Stage preview return, or direct route.

## 13. Navigation out

Users go to Stage, dashboard, full editor, Library detail, Thread detail, Approval Queue, or Sessions index. Ready for Stage transitions the session to ready but does not start recording or consent.

## 14. Components to avoid

Avoid treating prep as a third product surface, tactical scene maps, initiative trackers, encounter trackers, VTT export controls, automatic AI prep runs, live transcription, player controls, and custom calendar scheduling.

## 15. Visual tone

Prepared, practical, and active within the literary, modern, relaxing Sanctum. Use denser Amber structure and Sage Thread state without losing the calm desk-like tone. The page should feel like a tabletop prep packet being assembled, not a task-management board.

## 16. Claude Design prompt

```text
Create Relic's Prepare workspace inside The Sanctum for web and mobile. Show both an inline dashboard version and fuller editor logic through the same literary, modern, relaxing design language. Include canon-only prep briefing with source stamp, Thread carry-forward, agenda fields, pinned entities, checklist, packet preview, Relic Guide sidecar/sheet, AI-invoked Draft this session, Brainstorm beats, Draft an NPC, and Ready for Stage. Use Parchment base with Amber prep accents and Sage thread chips. Make clear that Prepare is a Sanctum workflow and bridge to Stage, not a third product surface. Relic Guide can prepare real create/edit actions, but canon changes require inline GM review or Approval Queue. Mobile should use stacked sections and sheets without reducing the workflow. Exclude initiative, encounter, tactical map, VTT, live transcription, player, and custom calendar features.
```
