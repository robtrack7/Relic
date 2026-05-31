---
status: active
authority: primary
scope: reference
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[11 - Product Basepoint]]"
  - "[[12 - MVP PRD]]"
supersedes: []
last_audited: 2026-05-19
source_file: "Relic Vault/03 - Glossary.md"
---

# Glossary

## Product Surfaces

- **The Sanctum**: Relic's home-base surface for worldbuilding, session prep, review, approval, settings, and export. It is available on web and mobile. Its tone is literary, modern, and relaxing. See [[30 - Sanctum UX Flow]].
- **The Stage**: Relic's live-session surface for agenda, pinned cards, search, capture, recording, dice, and End Session. It is available on web and mobile. Its tone is clean and focused. See [[32 - Stage UX Flow]].
- **Session prep workspace**: the prep workflow inside The Sanctum. Not a top-level product mode. See [[31 - Session Prep Flow]].
- **New saga / Saga creation**: first-run and later saga creation flow. Replaces retired user-facing creation-mode wording. See [[33 - First Run UX Flow]].

## Continuity Hierarchy

- **Account**: authenticated user identity. Not the billing or content boundary.
- **Workspace**: ownership, billing, usage, and future collaboration boundary.
- **World**: shared setting and World-canon container.
- **Era / Timeframe**: V1-ready world-history context; hidden/default backend handling in MVP.
- **Saga**: playable campaign/storyline inside a World.
- **Session**: prep/run/review unit inside a Saga.

## Canon Terms

- **Canon**: approved truth. Raw input and AI output are not canon until approved or directly created by the GM.
- **World canon**: true for the shared setting. Uses `scope='world'` and `saga_id=null`.
- **Saga canon**: true for one playable storyline. Uses `scope='saga'` and a required `saga_id`.
- **AI Draft**: proposal requiring GM approval before canon mutation.
- **Raw Input**: source material used to support drafts or canon records.
- **Archived**: soft-archived canon state; hard-delete is restricted.
- **Thread**: continuity spine for unresolved, active, dormant, failed, or resolved story movement. See [[30 - Sanctum UX Flow]].
- **Approval Queue**: review surface for AI/proposed canon changes before mutation. See [[24 - Approval Queue]].

## Internal Names Allowed In Specs

These are allowed as schema/task identifiers, not user-facing copy:

- `workshop_sessions`
- `workshop_input`
- `workshop_path`
- `workshop_state`
- `scaffold_saga`

## Renamed Before Coding

- Retrieval profile: `session_prep_grounding` replaces the prior prep-profile name.
- Query role: `prep_query` replaces the prior session-prep query role name.
- First-run dismissal field: `session_prep_intro_dismissed_at` replaces the prior dismissal field name.

## Avoid In User-Facing MVP Copy

- Campaign as a product object. Use **Saga**.
- Workshop as a surface. Use **New saga** or **Saga creation**.
- Studio as a surface. Use **session prep workspace**, **prep editor**, or **prep briefing**.
- Saga Creation as a branded/top-level surface. Use **New saga** or **Saga creation** in normal prose.


