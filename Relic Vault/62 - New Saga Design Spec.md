---
status: active
authority: secondary
scope: mvp-design
read_after:
  - "[[60 - Design Spec Overview]]"
depends_on:
  - "[[33 - First Run UX Flow]]"
  - "[[12 - MVP PRD]]"
  - "[[11 - Product Basepoint]]"
  - "[[14 - Design System Source]]"
supersedes: []
last_audited: 2026-05-30
source_file: "Relic Vault/62 - New Saga Design Spec.md"
---

> [!info] How to use this spec
> Use this for the New saga entry screen and help-level choice. Read with [[60 - Design Spec Overview]] and [[71 - Component Inventory Design Spec]]. Upstream behavior lives in [[33 - First Run UX Flow]], [[12 - MVP PRD]], and [[11 - Product Basepoint]].

# New Saga Design Spec

## 1. Purpose

New saga starts the Create step. It creates or selects a World, captures Saga name and GM profile, and routes the GM into Build with AI, Bring your notes, or Start blank.

The page must feel like beginning real work, not an onboarding tour. First run creates the GM's real first Saga.

## 2. Page synthesis

This screen distills [[33 - First Run UX Flow]] sections 1-4 and 8-9 into a focused form. It also preserves [[11 - Product Basepoint]] decisions: user-facing "New saga", no separate creation mode, no no-AI path, and Start blank with AI still available on demand.

The flow should be low-friction. Defaults can be selected, but the GM must understand the difference between World and Saga without being pulled into full World settings.

## 3. User mental model

The GM thinks: "I am starting a playable storyline inside a setting. I can let Relic help, bring material I already have, or start with an empty shell."

They do not expect to configure infrastructure. They expect naming, tone of help, and first creative input.

## 4. Primary user jobs

- Name the Saga.
- Choose or create the World it belongs to.
- Set practical GM-profile defaults that shape AI density.
- Choose help level: Build with AI, Bring your notes, or Start blank.
- Resume an unfinished new-Saga flow if one exists.

## 5. Primary action

The primary CTA changes with help-level selection:

- Build with AI: `Start building`.
- Bring your notes: `Add notes`.
- Start blank: `Create blank saga`.

The selected help-level card should determine CTA copy and destination.

## 6. Secondary actions

Secondary actions include resume previous draft, edit World name, use existing World, save and leave, sign out if first-run auth needs escape, and discard an abandoned draft with confirmation.

Unsupported import options, such as PDF or docx, can be mentioned only as disabled/help copy where upstream specs allow. Do not make them active MVP routes here.

## 7. Layout structure

Use a focused Sanctum creation layout, not the full dashboard. Parchment background, centered form width, Cream groups, Cormorant title `New saga`, and a simple progress/context label.

Desktop layout: left column for core fields and profile, right column for help-level cards and a short "What happens next" summary. Mobile stacks: title, resume card if present, Saga name, World choice, profile card, help-level cards, CTA.

Keep World choice compact. If no World exists, show `Relic will create a World for this saga` with an optional edit field. If Worlds exist, show a compact picker and helper text explaining shared setting reuse.

## 8. Key components

- Navigation: `FocusedCreationShell`, `ContextBackLink`, `ResumeCreationCard`.
- Inputs: `SagaNameField`, `GameSystemField`, `WorldChoicePicker`, `GMProfileCard`, `RadioCardGroup`, `CharacterCountMeter`.
- Actions: `HelpLevelPrimaryCTA`, `SaveAndLeaveButton`, `DiscardDraftConfirm`.
- Feedback: `DuplicateNameWarning`, `ValidationMessage`, `QuotaPreflightWarning`, `LoadingButton`.
- Trust: `DraftStateLabel`, `NoCanonYetNotice`.

See [[71 - Component Inventory Design Spec]].

## 9. Required states

Required states include first user with no World, returning user with one World, returning user with multiple Worlds, resumable new-Saga draft, duplicate Saga name in selected World, duplicate World name, missing required field, profile default selected, Start blank loading, AI path quota-blocked, network failure, save/resume success, and abandoned draft confirmation.

The quota-blocked state should keep Start blank available and preserve typed inputs.

## 10. AI behavior

No AI generation happens on the initial New saga form. AI begins only after the GM chooses Build with AI or Bring your notes and triggers the primary CTA. Start blank creates an empty Saga without invoking AI.

Profile copy can explain that selections shape future suggestions. Do not present model controls, provider choices, BYOK, local model settings, or image options.

## 11. Source/provenance behavior

There is no source evidence yet except user-entered input and resumed draft state. The screen should show `Draft` or `Not canon yet` where helpful. On AI-assisted paths, sources will be captured in the later conversation/notes and review flow.

## 12. Navigation in

Users arrive from first-login bootstrap, World/Saga switcher `+ New saga`, empty dashboard CTA, or import/notes CTA that defaults to Bring your notes.

## 13. Navigation out

Build with AI routes to the bounded conversation. Bring your notes routes to notes intake. Start blank commits the empty Saga and lands on [[61 - Sanctum Dashboard Design Spec]] behavior. Resume routes to the saved step. Cancel returns to previous Sanctum context when one exists.

## 14. Components to avoid

Avoid marketing hero pages, tutorial Saga setup, player setup, co-GM invitations, full World admin, Era editor, custom calendars, image generation, model/provider settings, PDF/RAG import controls, and any language that revives retired creation-mode branding.

## 15. Visual tone

Calm and ceremonial, but short. It should feel like opening a new field journal: tactile, focused, and ready for creation. Amber should mark the next step. Rust appears only for discard or blocked states.

## 16. Claude Design prompt

```text
Create Relic's New saga screen. It is a focused creation form inside The Sanctum, not a marketing onboarding page. Include Saga name, optional game system, compact World choice, GM profile card, and three help-level radio cards: Build with AI, Bring your notes, Start blank. The selected card changes the primary CTA. Show resume-draft and duplicate-name states. AI does not run on this page; it starts only after the GM invokes an AI-assisted path. Use Relic parchment/cream editorial styling and exclude player setup, full World admin, Era editor, model settings, and image generation.
```
