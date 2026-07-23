---
status: active
authority: secondary
scope: mvp-design
read_after:
  - "[[60 - Design Spec Overview]]"
depends_on:
  - "[[30 - Sanctum UX Flow]]"
  - "[[22 - Memory and Retrieval]]"
  - "[[23 - AI Task Registry]]"
  - "[[34 - UI Implementation Spec]]"
  - "[[13 - Design System]]"
  - "[[72 - Navigation Design Spec]]"
supersedes: []
last_audited: 2026-06-01
source_file: "Relic Vault/68 - Ask Search Design Spec.md"
---

> [!info] How to use this spec
> Use this for top-bar Search, command palette, search results, and Relic Guide. Read with [[60 - Design Spec Overview]], [[72 - Navigation Design Spec]], and [[71 - Component Inventory Design Spec]]. Upstream behavior lives in [[30 - Sanctum UX Flow]], [[22 - Memory and Retrieval]], [[23 - AI Task Registry]], and [[34 - UI Implementation Spec]].

# Search And Relic Guide Design Spec

**Packet E3 conversational Guide patch (July 2026).** Relic Guide is a persistent GM-owned, Saga-scoped conversational assistant over registered Relic tasks and deterministic tools. It retains bounded thread state across navigation, refresh, app restart, and later mobile handoff without treating conversation as canon or citation evidence. Typed provenance separates grounded facts from creative proposals, guidance, action previews, and insufficiency. E3 enables only open-record and confirmed entity-draft actions.

## 1. Purpose

Search and Relic Guide help the GM find, query, and act on current Saga canon plus relevant World canon. Search is a persistent top-context affordance. Relic Guide is an always-available collapsible sidecar/sheet, not a left-rail destination.

Search supports fast lookup. Relic Guide supports cited, canon-grounded answers and GM-reviewed create/edit actions.

## 2. Page synthesis

This spec ties [[30 - Sanctum UX Flow]] search/Guide behavior to [[22 - Memory and Retrieval]] grounding rules, [[23 - AI Task Registry]] `answer_saga_question`, and the navigation contract in [[72 - Navigation Design Spec]]. It preserves the shell rule: Search belongs in the top context bar, and Relic Guide is always available as a collapsible sidecar/sheet.

## 3. User mental model

The GM thinks: "I need to find the thing I already wrote" or "I need Relic to answer from canon and help me make a controlled change."

They expect scoped, cited retrieval and reviewable actions that respect the active World/Saga. They do not expect autonomous canon edits.

## 4. Primary user jobs

- Search by name, summary, tags, notes, and recent canon.
- Open an entity, Thread, Session, note, or review target quickly.
- Switch between literal/fast and hybrid/semantic modes where available.
- Ask a canon-grounded question and inspect citations in Relic Guide.
- Use Relic Guide from context without losing the current page.
- Draft, create, or edit through a GM-reviewed apply/approval path.
- Create a quick stub when search finds no result where appropriate.

## 5. Primary action

For search, primary action is selecting a result. For Relic Guide, primary action is submitting the prompt or accepting a reviewed action. Guide answers must not present factual canon claims without citations unless the no-answer state is returned.

The top context Search entry should be persistent; Relic Guide should be persistent as a collapsible sidecar/sheet.

## 6. Secondary actions

Secondary actions include filter by record type/scope/state, switch search mode, open full search page, expand/minimize Relic Guide, copy citation, open source, create quick stub, retry failed answer, rephrase question, apply reviewed working-state edit, route a draft to Review, and browse Library.

## 7. Layout structure

Top context bar includes a global Search entry beside Workspace/World/Saga context and a Relic Guide toggle/handle. Search modal or page shows grouped results: Threads first when relevant, then Library records, sessions, notes, and review/source hits.

Relic Guide uses a single-column conversational prompt/result/action layout with source citations inline and source panel/sheet. On desktop it docks as a collapsible right sidecar across Sanctum and Stage; on mobile it opens as a sheet/drawer. It can be minimized to a slim handle without losing state, and the same Saga thread can resume after refresh or later on mobile. It should feel like a sourced project-action assistant, not a personality-driven general chatbot.

Mobile uses search as a full-screen modal and Relic Guide as a sheet/drawer.

## 8. Key components

- Navigation: `SearchInput`, `RelicGuideToggle`, `CommandPalette`, `FullSearchPage`, `RelicGuideSidecar`, `RelicGuideSheet`.
- Inputs: `SearchInput`, `GuidePromptInput`, `SearchModeToggle`, `ScopeFilter`, `TypeFilterChips`.
- Containment: `SearchResultGroup`, `SearchResultRow`, `GuideAnswerCard`, `GuideActionCard`, `CitationList`, `SourcePreviewPanel`.
- Feedback: `SearchSkeleton`, `NoResultsState`, `NoAnswerState`, `HybridUnavailableState`, `SearchTimeoutFallback`, `GuideRetryBanner`.
- Trust: `CitationBadge`, `CanonOnlyBadge`, `ScopeChip`, `SourceExcerpt`.

See [[71 - Component Inventory Design Spec]].

## 9. Required states

Required states: empty query, recent searches, loading results, no results, literal results, hybrid results, hybrid offline unavailable, timeout fallback to literal, permission-safe empty, Guide minimized, Guide composing, Guide answer with citations, Guide proposed action, inline review ready, routed-to-Review draft, no-answer, hallucinated/invalid citation failure hidden behind retry, quota blocked, network error, source panel open, mobile full-screen search.

No-answer copy should say Relic does not have enough information in current canon and offer search/browse alternatives.

## 10. AI behavior

Search can be literal/local or hybrid. Relic Guide is GM-invoked. It answers from canon with citations for factual claims, can suggest actions from current context, and can prepare drafts or edits.

Relic Guide can apply low-risk session/prep working-state changes only after GM preview. Canon-impacting changes require either inline GM-reviewed commit or Approval Queue draft with provenance. Guide should preserve the GM's prompt on failure. Quota-blocked state should keep literal search available.

## 11. Source/provenance behavior

Relic Guide citations are mandatory per grounded factual paragraph. Creative proposal material from registered creation tasks is visibly labeled new/non-canon and does not receive fabricated citations; when a proposal uses canon constraints, citations support those constraints without implying the new material is already canon. Citation rows should show source label and open a source preview, Library detail, note, or transcript segment as appropriate.

Search results should show enough provenance to distinguish Canon, AI Draft where allowed, Raw/session source, Archived, and World vs Saga scope. Default search should emphasize current Saga canon plus relevant World canon and exclude sibling Sagas.

## 12. Navigation in

Users enter search from the top context bar, keyboard shortcut, Stage search, mobile search entry, entity picker, or no-results quick stub flow. Users open Relic Guide from its persistent sidecar handle/toggle, contextual action, dashboard card, Library detail, Thread detail, Prepare, or Stage.

## 13. Navigation out

Search routes to result detail, review item, prep target, or quick stub creation. Relic Guide citations route to source/detail pages. Guide action cards route to inline review, applied working-state change, or Approval Queue draft. Minimizing sidecar returns to previous page without changing context.

## 14. Components to avoid

Avoid autonomous chatbot behavior, proactive prompts that imply the system noticed something on its own, uncited factual answers, cross-Saga default search, player-facing answer views, model picker, local model settings, BYOK controls, and answer-to-canon buttons without GM review.

## 15. Visual tone

Fast, precise, quiet, and compatible with the literary, modern, relaxing Sanctum and clean, focused Stage. Search should feel like a command palette inside an editorial workspace. Relic Guide should feel like a cited reference and action sidecar, not a personality-driven chatbot.

## 16. Claude Design prompt

```text
Create Relic's Search and Relic Guide surfaces for the literary, modern, relaxing Sanctum and clean, focused Stage. Top context Search opens Find results, command palette, and full search page with scope/type filters and grouped results. Relic Guide is an always-available collapsible sidecar on desktop and sheet/drawer on mobile, not a left-rail item. Guide answers are GM-invoked and require citations for factual canon claims; include no-answer, quota, retry, source preview, proposed action, inline review, and routed-to-Review states. Guide can prepare real create/edit actions, but canon mutation requires inline GM review or Approval Queue. Default retrieval is current Saga plus relevant World canon. Use Relic editorial styling and exclude autonomous chat, model settings, BYOK, cross-Saga default search, and answer-to-canon actions without review.
```
