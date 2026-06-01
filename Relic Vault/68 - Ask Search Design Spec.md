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
last_audited: 2026-05-31
source_file: "Relic Vault/68 - Ask Search Design Spec.md"
---

> [!info] How to use this spec
> Use this for the top-bar `Search or ask...` omnibox, command palette, search results, and Ask Relic. Read with [[60 - Design Spec Overview]], [[72 - Navigation Design Spec]], and [[71 - Component Inventory Design Spec]]. Upstream behavior lives in [[30 - Sanctum UX Flow]], [[22 - Memory and Retrieval]], [[23 - AI Task Registry]], and [[34 - UI Implementation Spec]].

# Ask Search Design Spec

## 1. Purpose

Search and Ask help the GM find or query current Saga canon plus relevant World canon. They share a persistent top-context `Search or ask...` omnibox. Ask Relic is a page, collapsible sidecar, or contextual action, not a permanent chatbot column or primary left-rail destination.

Search supports fast lookup. Ask supports cited, canon-grounded answers.

## 2. Page synthesis

This spec ties [[30 - Sanctum UX Flow]] search/Ask behavior to [[22 - Memory and Retrieval]] grounding rules, [[23 - AI Task Registry]] `answer_saga_question`, and the navigation contract in [[72 - Navigation Design Spec]]. It preserves the shell rule: Search and Ask belong in the top context bar, with deeper page/sidecar entry only when summoned.

## 3. User mental model

The GM thinks: "I need to find the thing I already wrote" or "I need Relic to answer from canon."

They do not expect an always-on assistant. They expect scoped, cited retrieval that respects the active World/Saga.

## 4. Primary user jobs

- Search by name, summary, tags, notes, and recent canon.
- Open an entity, Thread, Session, note, or review target quickly.
- Switch between literal/fast and hybrid/semantic modes where available.
- Ask a canon-grounded question and inspect citations.
- Use Ask from context without losing the current page.
- Create a quick stub when search finds no result where appropriate.

## 5. Primary action

For search, primary action is selecting a result. For Ask, primary action is submitting the question. Ask answer must not appear without citations unless the no-answer state is returned.

The top context omnibox should be the most persistent entry; the Ask page is the deeper Q&A surface.

## 6. Secondary actions

Secondary actions include filter by record type/scope/state, switch search mode, open full search page, open Ask sidecar, copy citation, open source, create quick stub, retry failed answer, rephrase question, and browse Library.

## 7. Layout structure

Top context bar includes a global `Search or ask...` omnibox beside Workspace/World/Saga context. The omnibox supports Find/Ask behavior: search-like input prioritizes results and command shortcuts; question-like input offers a cited Ask answer. Search modal or page shows grouped results: Threads first when relevant, then Library records, sessions, notes, and review/source hits.

Ask page or sidecar uses a single-column question/answer layout with source citations inline and source panel/sheet. From the dashboard or detail pages, Ask may dock as a temporary right utility sidecar. It must not become a persistent right chat column on every screen. Contextual Ask can open as a drawer from detail pages and prep, but it closes back to the originating page.

Mobile uses search as a full-screen modal and Ask as a page/sheet.

## 8. Key components

- Navigation: `SearchOrAskOmnibox`, `CommandPalette`, `FullSearchPage`, `AskPage`, `AskSidecar`.
- Inputs: `SearchInput`, `QuestionInput`, `SearchModeToggle`, `ScopeFilter`, `TypeFilterChips`.
- Containment: `SearchResultGroup`, `SearchResultRow`, `AskAnswerCard`, `CitationList`, `SourcePreviewPanel`.
- Feedback: `SearchSkeleton`, `NoResultsState`, `NoAnswerState`, `HybridUnavailableState`, `SearchTimeoutFallback`, `AskRetryBanner`.
- Trust: `CitationBadge`, `CanonOnlyBadge`, `ScopeChip`, `SourceExcerpt`.

See [[71 - Component Inventory Design Spec]].

## 9. Required states

Required states: empty query, recent searches, loading results, no results, literal results, hybrid results, hybrid offline unavailable, timeout fallback to literal, permission-safe empty, Ask composing, Ask answer with citations, no-answer, hallucinated/invalid citation failure hidden behind retry, quota blocked, network error, source panel open, mobile full-screen search.

No-answer copy should say Relic does not have enough information in current canon and offer search/browse alternatives.

## 10. AI behavior

Search can be literal/local or hybrid. Ask is a GM-invoked AI task. It answers only from canon and requires citations for factual claims. It does not create drafts, edit canon, suggest actions unsolicited, or continue chatting unprompted.

Ask should preserve the GM's question on failure. Quota-blocked state should keep literal search available.

## 11. Source/provenance behavior

Ask citations are mandatory when `no_answer=false`. Citation rows should show source label and open a source preview, Library detail, note, or transcript segment as appropriate.

Search results should show enough provenance to distinguish Canon, AI Draft where allowed, Raw/session source, Archived, and World vs Saga scope. Default search should emphasize current Saga canon plus relevant World canon and exclude sibling Sagas.

## 12. Navigation in

Users enter search from the top context bar, keyboard shortcut, Stage search, mobile Search/Ask entry, entity picker, or no-results quick stub flow. Users enter Ask from the top omnibox, contextual action, dashboard card, Library detail, Thread detail, or prep workspace.

## 13. Navigation out

Search routes to result detail, review item, prep target, or quick stub creation. Ask citations route to source/detail pages. Closing sidecar returns to previous page without changing context.

## 14. Components to avoid

Avoid permanent chatbot columns, proactive prompts, uncited answers, cross-Saga default search, player-facing answer views, model picker, local model settings, BYOK controls, and answer-to-canon buttons.

## 15. Visual tone

Fast, precise, quiet, and compatible with the literary, modern, relaxing Sanctum. Search should feel like a command palette inside an editorial workspace. Ask should feel like a cited reference answer, not a personality-driven chatbot.

## 16. Claude Design prompt

```text
Create Relic's Search and Ask surfaces for the literary, modern, relaxing Sanctum on web and mobile. A top context `Search or ask...` omnibox opens Find results, Ask answers, command palette, and full search page with scope/type filters and grouped results. Ask Relic is a page, collapsible sidecar, or contextual action, not a permanent chatbot column or primary left-rail item. Ask answers are canon-only, GM-invoked, and require citations; include no-answer, quota, retry, and source preview states. Default retrieval is current Saga plus relevant World canon. Use Relic editorial styling and exclude proactive chat, model settings, BYOK, cross-Saga default search, and answer-to-canon actions.
```
