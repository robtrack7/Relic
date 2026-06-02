---
status: active
authority: primary
scope: mvp
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[00 - Start Here]]"
supersedes: []
last_audited: 2026-05-20
source_file: "Sourced - Downloaded - 260518/relic-product-basepoint-v3_5.md"
---

> [!info] How to use this spec
> Owns: Product north star, MVP/P1/V1 boundaries, core loop, naming, and exclusions.
> Does not own: Historical rationale and superseded naming unless explicitly retained as an internal identifier.
> Read next: [[00 - Start Here]]
> Implementation-critical note: Highest product authority after [[00 - Start Here]].
# Relic Product Basepoint v3.5

*Source-of-truth product brief. Updated May 2026.*

This document defines the locked direction for Relic. It guides product, UX, architecture, AI design, and MVP scoping until explicitly revised.

---

## Changelog

**v3.5 (May 2026).** Document-control and Priority 5/6 alignment pass. Updates active-source references to the current versioned files, recognizes the UI Implementation Spec v0.2 and Pricing & Rate Limits Spec v0.2 as locked implementation sources, and resolves the prior open pricing/rate-limit item. No change to the locked MVP loop, stack, canon rule, or Workspace / World / Era / Saga hierarchy.

**v3.4 (May 2026).** Five targeted revisions informed by master flow interrogation and revision process:

1. **§5 Mode model revised.** session prep workspace is no longer a peer top-level mode — it is an embedded surface inside the Sanctum home page when a session is active. The bottom tab bar on mobile becomes Sanctum · Stage (two tabs, not three). session prep workspace's prep editor is still a distinct surface within Sanctum but not a mode the GM switches into.
2. **§5 / §14 Cream theme retired.** session prep workspace no longer has its own Cream surface treatment as a mode differentiator. Session prep areas within the Sanctum use Amber-forward card accents and Verdigris for thread-state signals to visually distinguish prep context within the Parchment frame. Stage dark treatment is unchanged.
3. **§6 Saga creation simplified.** "The Saga Creation" branding retired as a user-facing name. Saga creation is now a focused "New saga" flow with a help-level choice (three options). No-AI path removed — GMs who want no AI assistance use the Start Blank option; AI features remain available on-demand from any screen. Tutorial-as-saga concept retained but entry is now through the new-saga flow, not a named "Saga Creation mode."
4. **§8 / §10 AI creative tasks added to MVP scope.** AI is a button the GM can press across creative and editorial domains. New MVP AI tasks added: `propose_scene_beats`, `propose_thread_complication`, `propose_npc_for_scene`. `propose_quick_stub_fleshing` promoted from V1 to MVP. All are GM-invoked only, never auto-run.
5. **§8 Threads promoted to continuity spine.** Threads are the canonical continuity entity; the Sanctum gives them a top-level nav position. A Thread Timeline view (read-only, derived from existing `objectives_log` and `resolution_state` data) ships in MVP. The "timeline editor" MVP exclusion in §12 is revised to exclude only a writable timeline editor; the read-only thread timeline is in MVP.

**Priority 3 continuity architecture patch (May 2026).** Applies the Workspace / World / Era / Saga hierarchy across product, UX, AI, retrieval, schema, and RLS assumptions:

1. **Workspace** is the ownership, billing, usage, and future-collaboration boundary.
2. **World** is the shared setting and world-level canon container.
3. **Era/Timeframe** is V1-ready temporal context for World history; MVP may create a default hidden Era but does not expose an Era editor.
4. **Saga** is the playable campaign/storyline inside a World, not the top structural container.
5. Major content rows reserve `workspace_id`, `world_id`, nullable `saga_id`, and `scope = 'world' | 'saga'` where applicable.
6. Post-session canon changes default to Saga scope. World-canon promotion and era-specific versioning are reserved for V1.
7. Timeline remains a derived read-only projection from Sessions, Threads, and approved canon activity. Relationship and timeline graph visualizations remain V1, with data foundations preserved.


---

## 0. Locked Direction

**Product:** Relic
**Category:** AI-assisted saga creation and continuity workspace for tabletop Game Masters
**MVP user:** Game Master only — players, publishing, and per-player permissions are deferred
**Core loop:** Create → Organize → Prep → Run → Review → Approve → Continue
**Primary surfaces:** The Sanctum and The Stage are Relic's two product surfaces on both web and mobile. The Sanctum is the home base for worldbuilding, embedded session prep, review, approval, and canon work. The Stage is the live-play surface. Web is the first implementation target; mobile follows after the web app proves the full loop.
**Locked stack:** Expo + Next.js + Supabase + LiteLLM + Whisper + pgvector
**Canon rule:** AI drafts. GM approves. Canon changes only by explicit GM action.
**AI invocation rule:** AI is a button the GM can press, across creative and editorial domains. Many buttons exist. None push themselves.
**Ceremonial naming:** "Saga" replaces user-facing "Campaign" for the playable campaign/storyline. Structurally, Saga lives inside a World, which lives inside a Workspace. Do not add a separate Campaign layer.

---

## 1. Product Thesis

Relic is an AI-assisted saga creation and continuity engine for Game Masters. Most GM tools solve fragments — notes, maps, wikis, prep, VTTs, recaps. Relic is built around the workflow itself: turning an idea or messy notes into a playable saga inside a coherent world, preparing sessions, supporting live play, processing what happened, and maintaining coherent World and Saga canon over time.

The GM is the creative director. The AI scaffolds, organizes, links, summarizes, proposes, and brainstorms — whenever the GM asks it to. The database preserves what is true.

**Product promise:** Let the GM tell the story. Let Relic mind the mess.
**Positioning:** The saga co-pilot for GMs who would rather be worldbuilding than bookkeeping.
**Tagline:** Build the myth. Run the table. Keep the thread.

---

## 2. What Relic Is and Is Not

**Is:** An AI-assisted creation workspace · a continuity engine · a structured-but-flexible GM knowledge base · a session prep and live companion · a post-session review and canon maintenance tool.

**Is not:** A VTT · a combat engine · a rules database · a player wiki (in MVP) · an autonomous AI storyteller · a chatbot bolted onto a wiki · a generic notes app with fantasy styling.

---

## 3. Primary User

**The busy creative GM.** Wants a rich, coherent saga without spending hours maintaining documents, rebuilding prep notes, searching scattered files, or reconstructing what happened after every session. More story, less administration.

**Alpha cohort (locked):** Returning GMs starting a new saga within the next 30 days. The saga-creation flow is their wedge; their needs define MVP activation. New GMs are a secondary group we observe but do not optimize for. **Bring Your Notes** is the path optimized for this cohort — they already have notes and ideas.

**Saga sizing target:** Designed for 500 Saga-scoped entities per saga, tested to 1000, soft warning above. World-scoped canon is expected to stay lighter in MVP. The alpha cohort should never hit this ceiling in normal use; the cap exists so performance promises hold.

**Not primary in MVP:** players, rules-heavy tactical GMs, VTT-driven groups.

---

## 4. The GM Loop

Relic is organized around one recurring loop. Every product decision must make this loop faster, clearer, more trustworthy, or more delightful.

**Create →** Idea, prompt, pasted notes, or imported material becomes a World plus Saga scaffold, with the World created quietly when needed.
**Organize →** Material becomes linked entities, threads, sessions, and prep.
**Prep →** Saga state plus relevant World/Era canon becomes a practical session packet.
**Run →** The Stage gives fast access to packet, pinned entities, capture, search, dice, optional recording.
**Review →** Recording, transcript, or notes become summary, proposed updates, loose threads, prep implications.
**Approve →** GM approves, edits, rejects, merges, or archives. Nothing becomes canon automatically.
**Continue →** Approved changes update saga state and feed the next prep cycle.

---

## 5. The Two Modes

**v3.4 change: session prep workspace is no longer a peer mode. It is a surface embedded within the Sanctum.**

**The Sanctum** — the GM's home base. Literary, modern, relaxing, organized. The Sanctum handles everything between sessions: Workspace/World/Saga switching, saga creation, dashboard, entity management, thread tracking, world-canon browsing, long-form notes, smart linking, import inbox, session prep (embedded), post-session review, approval queue, settings, export.

When the GM is prepping a session, the Sanctum's home surface *is* the session prep view — the briefing, agenda editor, thread carry-forward, and packet preview are all rendered inline within the Sanctum's parchment frame. The GM does not "switch to session prep workspace" — they open their session from the Sanctum home and the prep workspace opens within it.

**The Stage** — the live-session surface. Clean, focused, glanceable, hard to break. Handles: current session, agenda, pinned cards, search, quick capture, quick stubs, recording, Mark Moment, basic dice, end session. Stage exists on both web and mobile, with platform-appropriate layout and offline behavior.

**Surface rule:** The Sanctum and The Stage are two sides of the same product, not separate platform products. Both web and mobile must support both surfaces. The implementation sequence is web app first, then mobile app, because web is the faster place to prove the full GM loop.

**AI on The Stage:** unsolicited AI behavior is dormant. Search is the only GM-initiated AI affordance on Stage. During `in_progress` and `ended_pending_undo`, no background entity tagging, mention detection, summarization, prep nudges, or notification prompts run. Recording is captured and transcription is queued, but synthesis does not begin until End Session. V1 may add GM-initiated generators, but generated candidates remain non-canon until explicitly saved and approved.

**Sanctum → Stage:** the GM opens their session from the Sanctum home (Ready for Stage button) and the Stage opens. Until `in_progress`, the GM can return to Sanctum, edit prep, and re-open Stage. Prep locks when the session becomes `in_progress`.

**End Session:** two-step confirm plus a 60-second undo banner. End Session is the seam between Run and Review; treating it as soft-reversible protects accidental loss of in-progress session state.

**Recording is cross-platform.** Mobile records via native APIs; web records via browser MediaRecorder with the same chunked-upload pattern. The Stage does not require a specific platform to function — laptop play and phone/tablet play are both first-class cases.

**Mobile bottom tab bar:** Sanctum · Stage (two tabs). Session prep is reached from inside the Sanctum tab.

---

## 6. Saga creation

**v3.4 change: "The Saga Creation" is retired as a user-facing brand. Saga creation is a focused "New saga" flow with a help-level choice. The No-AI path is removed.**

Saga creation is reached from the World/Saga switcher → `+ New saga`. It is an entry flow, not a mode. If the GM has no World yet, Relic creates one behind the scenes from the saga name and premise. If a World exists, the GM can reuse it or create a new one. MVP keeps this lightweight; a full World dashboard is deferred.

**Three help levels**, presented as a single choice at creation time:

1. **Build with AI** — GM tells Relic the idea (typed conversation or a few questions). AI drafts a starting place, initial NPCs, threads, and a first-session packet. GM reviews, edits, and commits. The conversational scaffolding (internally `scaffold_saga`) produces AI Draft entities; commit promotes them to canon. This is the optimized path for new GMs or GMs starting from scratch.

2. **Bring your notes** — GM pastes existing notes, fragments, or ideas (up to 50,000 characters). AI organizes and expands the material into structured entities and a first-session packet. Same review-and-commit flow as Build with AI. Optimized path for the alpha cohort — returning GMs with existing material.

3. **Start blank** — Saga is created empty inside the selected or newly created World. The Sanctum opens with an empty library. Every AI feature (entity drafting, note expansion, Ask, creative suggestions) is available immediately on-demand. No scaffolding, no initial entities. For GMs who know exactly what they want to build.

**GM profile** is captured at the start of Build with AI and Bring your notes paths. It lives in two places: a user-level default set at first saga creation, and a per-saga override. Profile shapes scaffold density and AI output tone. Start blank uses the existing default profile.

**First-run:** a new user's first saga creation uses the same flow. Build with AI is the recommended path and is highlighted, but all three options are available. The scaffold output becomes their real first saga — there is no separate tutorial.

**Activation target:** scaffold-to-runnable in 10–20 minutes via Build with AI.

**Internal implementation note:** The scaffolding conversation and review screen are still powered by the `scaffold_saga` AI task (Registry v1.0 §2) and write through the `workshop_input` source kind. The user-facing name "Saga Creation" is historical only; do not surface it in UI.

---

## 7. The First-Session Packet

The packet is the activation moment. It must be **glanceable, runnable, and shaped by the GM profile**:

- One opening scene with 2–3 likely paths.
- Each path pre-populated with the Characters and Places needed.
- Session objective and the active Threads it touches.
- 3–5 pinned entities ready for The Stage.
- A pre-prep checklist of 3–5 decisions the GM should make before sitting down.

The depth of pre-population scales with the profile: a new GM gets fuller scenes and dialogue prompts; an experienced GM gets sharper hooks and more room to improvise.

---

## 8. Entity Model

Six entity types. Faction is first-class because collective intent ("House Kael wants the deed") models cleanly only as its own primitive.

| Entity | Role |
|---|---|
| **Character** | NPCs and PCs (PC is a subtype). The people in the saga. |
| **Place** | Locations at any scale — region, settlement, room. |
| **Faction** | Collective actors with shared intent — houses, guilds, cults, governments. |
| **Artifact** | Objects of significance — items, relics, documents. |
| **Thread** | **The continuity spine of the saga.** Narrative tensions with objectives, status, and a resolution arc. Thread state (active, dormant, resolved, failed) and objective history are first-class data. Threads are the primary way the GM tracks what carries forward between sessions. Game-y "quests" are a tag/state on a Thread. |
| **Session** | A run of play with a packet, recording, transcript, and outcomes. |

**v3.4: Threads are the continuity backbone, not just another entity type.** In MVP, Threads are Saga-scoped continuity objects; future World-spanning threads require explicit V1 scope work. The Sanctum promotes Threads to a top-level nav position and exposes a Thread Timeline view — a read-only, chronological display of thread state changes across sessions, derived from Sessions, Threads, `objectives_log`, and `canon_audit`. The timeline ships in MVP; a writable standalone timeline editor remains V1. Timeline markers must preserve Workspace/World/Saga IDs and source provenance so V1 visualizations can reuse the same foundations.

**Lore** is not an entity — it's a note type that can attach to any entity, to multiple entities, or to none (free-floating worldbuilding).

**Shared entity fields:** ID, `workspace_id`, `world_id`, nullable `saga_id`, `scope` (`world` or `saga`), type, name, short summary, narrative content, GM notes, status, tags, canon state, source references, created-by (GM/AI), last updated, relationships, search index, embedding metadata. World-scoped records use `scope='world'` and `saga_id=null`; Saga-scoped records use `scope='saga'` and a required `saga_id`.

---

## 9. Canon and Approval Model

Information state must be obvious.

**Four states:** Raw Input · AI Draft · Canon · Archived. *Published* is reserved for future player-facing features.

**Canon rule:** Raw input is not canon. AI output is not canon. Canon is only what the GM approves. Canon has scope: **World canon** is true for the shared setting; **Saga canon** is true for one playable storyline. Post-session outputs default to Saga scope. World-canon promotion, era-specific canon versions, and cross-Saga conflict resolution are V1.

**Source model:** every AI draft preserves source context — prompt, imported file, transcript segment, session note, existing entity, or manual GM instruction. Session-derived updates cite timestamped transcript segments when available.

**Approval Queue (MVP, grouped-by-entity):**

- Drafts are batched per affected entity ("4 changes to Seraphine"). GM reviews and acts on each, then commits the entity's batch.
- Each proposed update shows: affected entity, proposed change, old value, new value, source reference, confidence band.
- **Confidence band** uses a source-quality proxy, not model self-reporting: direct GM input = high, clean transcript segment = medium, inferred from context = low. Low-confidence proposals flagged `Needs review`.
- Actions: edit, approve, reject, merge, archive.
- No prominent "approve all."
- **Persistence:** queues persist indefinitely. After 30 days untouched, a stale warning surfaces with "re-run synthesis" or "bulk archive" options. Nothing is destroyed without GM action.

**Approval Queue (V1 target):** paragraph-level track-changes inside the two-pane editorial diff. The two-pane layout itself is MVP; granular paragraph-level editing within it is V1.

---

## 10. AI Layer

Core infrastructure. Not a decorative chat feature.

**AI acts as:** scaffolder, creative brainstorming partner, archivist, organizer, link suggester, prep assistant, session summarizer, continuity assistant, draft producer. All AI tasks receive Workspace/World/Saga context and optional Era context when relevant.

**AI never acts as:** final author, canon authority, autonomous publisher, rules judge, replacement for the GM.

**v3.4: AI invocation rule.** AI is available across creative and editorial domains. The line is not the domain (creative vs. administrative) — the line is invocation. AI never fires unsolicited. The GM presses a button; the AI proposes; the GM accepts, edits, or discards. This applies equally to suggesting a plot complication, drafting an NPC, and summarizing a session.

**Hard rules:**

1. AI output defaults to draft.
2. AI never silently writes to canon.
3. AI never deletes records.
4. AI output must be inspectable, editable, rejectable, source-aware.
5. Imported text, transcripts, and pasted content are untrusted data, never instructions.
6. All model calls route through the backend.

**Model strategy:**

| Tier | Description | Timing |
|---|---|---:|
| Built-in default | Relic-managed access via LiteLLM | MVP |
| BYOK | User-supplied provider keys | V1 |
| Local models | Ollama / LM Studio for supported tasks | V1 |

MVP is model-agnostic internally, simple externally. Users do not choose models in MVP.

**MVP AI tasks (v3.4 additions marked):** scaffold a saga · draft entities from prompts or notes · expand rough notes · suggest missing fields · detect entity mentions · suggest backlinks · generate session prep · search saga context · summarize sessions · extract proposed canon updates · identify loose threads · suggest next-session prep implications · **propose scene beats** (new) · **propose thread complications** (new) · **propose NPC for scene** (new) · **flesh out stub from session evidence** (promoted from V1).

---

## 11. Recording and Consent

**Default:** per-session consent confirmed on the GM's device at session start. A simple "players consented · yes/no" gate before recording begins. GM is responsible for player consent; Relic does not manage it across players.

**Audio retention default:** delete after successful transcription. GM can opt into retention per saga.

**Transcript retention default:** retained. Transcripts are the source of truth for approved canon changes and must be reviewable and editable. GMs can correct Whisper errors per segment during the pipeline review window — segment text only; timestamps and segment boundaries are immutable. Source citations (the `raw_excerpt` field on each cited source) are frozen at draft creation; the source view in the Approval Queue surfaces a citation-drift indicator if the live transcript has been edited since the citation was captured. GM can delete the whole transcript per session from saga settings.

### 11.1 Notifications

Relic notifies the GM when the post-session pipeline finishes, when it fails, and when an Approval Queue has gone stale. Without these, the loop breaks — GMs forget the pipeline finished, queues age out, and momentum dies between sessions.

**Channels:** email (via Resend) and mobile push (via Expo Push).

**Defaults on:** pipeline ready, pipeline failed, queue stale at 30 days, queue stale at 90 days.

**Defaults off (available):** transcription complete, synthesis in progress.

**Per-kind, per-channel opt-out** is GM-controlled from account or saga settings. A master "pause all" switch is available.

**Explicit silences:**
- During an active session: no push or email fires while `in_progress` or `ended_pending_undo`.
- No SMS. No web push (deferred to V1). No per-saga subscription splits in MVP.

---

## 12. MVP Scope

**MVP proof statement:** A GM can start with an idea or rough notes, create a playable saga scaffold in 10–20 minutes, prep a session, run with mobile support, process what happened, approve canon updates, and use them to prep again.

### P0 — Must ship

**Account & Saga**
GM account · create/rename/switch/delete sagas · basic saga settings · GM profile (user-default + per-saga override)

**Saga creation (formerly "The Saga Creation")**
Build with AI / Bring your notes / Start blank help-level choice · profile-aware scaffold output · premise, tone, genre, central conflict, starting place, initial Characters/Factions/Threads, first-session hook, GM secrets, prep checklist · review, edit, regenerate, approve

**Entity System** — six types (Character, Place, Faction, Artifact, Thread, Session) with shared fields, full-text search, mention detection, soft backlinks, Draft/Canon/Archived states, source references

**Thread System** — thread list by resolution state · Thread Timeline view (read-only, derived from `objectives_log` + `canon_audit`) · thread carry-forward in session prep · loose thread extraction in post-session pipeline

**Session Prep (within Sanctum)** — create session · objective · agenda editor · opening scene · scene notes · active threads · GM-initiated AI prep synthesis · AI creative suggestions (scene beats, thread complications, NPCs) · suggested pinned entities · packet preview · Ready for Stage transition · prep from loose threads · stub fleshing from session evidence

**The Stage** — current session screen · agenda · pinned cards · quick search · quick capture · quick stubs · recording with per-session consent · chunked local audio save · Mark Moment · end session · basic dice

**Post-Session Pipeline** — audio upload · pasted notes · manual summary · Whisper transcription · transcript viewer with timestamps · per-segment transcript editing within the review window · GM summary · proposed entity updates · proposed new entities · loose thread extraction · next-session prep suggestions · Approval Queue (grouped-by-entity) · diff view · commit to canon

**AI & Retrieval** — LiteLLM proxy · task-based routing · scaffold, entity draft, note expansion, link suggestions, prep, post-session synthesis · GM-invoked creative suggestions · saga-aware semantic search · source-aware answers · no autonomous canon writes

**Trust & Data** — Supabase RLS by Workspace/World/Saga and user · canon audit log · AI draft provenance · audio retention setting · Markdown and JSON export · notifications (email + mobile push) for pipeline-ready, pipeline-failed, and stale queues; per-kind opt-out

### P1 — After P0 is stable

Import inbox (Markdown/plain text) · docx import if straightforward · practical approval review on mobile · better relationship labels · broader offline prep packet management beyond the current Stage packet · usage and processing limits display.

### Explicit MVP exclusions

Player wiki · player accounts · recap publishing · shareable saga pages · per-player permissions · initiative tracking · encounter tracking · tactical maps · VTT integration · rules database · system-specific automation · image generation · custom calendars · full World dashboard · Era editor UI · World-canon promotion workflow · cross-Saga graph or timeline · temporal contradiction detection · **writable timeline editor** (read-only thread timeline is MVP) · relationship graph · contradiction detection · speaker diarization · real-time transcription · local models · BYOK UI · plugins · marketplace · autonomous canon editing.

---

## 13. Technical Architecture

| Layer | Technology | Role |
|---|---|---|
| Web | Next.js App Router + TypeScript | First full Relic app implementation: Sanctum and Stage |
| Mobile | Expo + React Native + TypeScript | Second full Relic app implementation: Sanctum and Stage adapted for mobile ergonomics and offline play |
| Database | Supabase Postgres | Source of truth |
| Auth | Supabase Auth | GM accounts |
| Storage | Supabase Storage | Audio, imports, attachments |
| Security | Supabase RLS | Workspace/World/Saga isolation, enforced day one |
| Vector | pgvector | Workspace/World/Saga-aware retrieval |
| AI routing | LiteLLM proxy | Provider abstraction |
| AI proxy hosting | Fly.io | LiteLLM container per environment |
| Transcription | OpenAI Whisper API | Async post-session |
| Notifications | Resend (email) + Expo Push (mobile) | GM-facing async signals |
| Local state | expo-sqlite + Drizzle | Offline session cache |
| Client state | Zustand | UI state |
| Server state | React Query | Server sync |
| Jobs | Supabase Edge Functions | Async processing |
| Monitoring | Sentry + PostHog | Errors and analytics |
| Deployment | EAS (mobile) · Vercel (web) | Distribution |

**Offline scope:** current session packet, pinned entities, session notes, quick capture, recording metadata, pending uploads. CRDT collaboration is deferred.

**Permission stance:** GM-only access in MVP, architecture future-compatible with player-facing separation.

For full backend contracts see Tech Architecture Spec v1.2.

---

## 14. Design Direction

Design system file: `[[13 - Design System]]` — always reference before building UI. The HTML source remains available at [[14 - Design System Source.html]].

**Language:** literary, modern, relaxing in The Sanctum; clean and focused in The Stage. A beautifully designed field journal rebuilt as a contemporary app.

**Typefaces:** Cormorant Garamond (display) · Instrument Sans (UI) · DM Mono (mono).

**Palette:** Parchment #EFEBE4 · Cream #F7F4EF · Ink #1A1916 · Amber #B8702A · Rust #8A3828 · Verdigris #2F6B6E.

**v3.4: Mode surface treatment revised.**

| Surface | Base | Distinguishing elements |
|---|---|---|
| **Sanctum** | Parchment #EFEBE4 | Cream cards on Parchment background. Literary, modern, relaxing. |
| **Session prep (within Sanctum)** | Parchment #EFEBE4 | Amber-forward accents: prep CTAs, Ready for Stage button, agenda fields use Amber left-rules. Verdigris used for thread-state indicators (active, loose, resolved). No separate Cream surface — prep is visually differentiated by Amber/Verdigris accent density, not a different background color. |
| **Stage** | Ink #1A1916 | Clean, focused, high-contrast Cream foreground. Amber for action state. Rust reserved for recording state. |

The Cream surface as a separate mode differentiator is retired. Cream remains available as a card surface within the Sanctum frame. The Stage dark treatment is unchanged.

**Principles:**
1. Editorial restraint.
2. Warm, not generic SaaS.
3. Literary hierarchy — Cormorant carries names, Instrument carries UI, never compete.
4. Amber marks action and consequence, not decoration.
5. The GM is the author — UI language is deferential.
6. The Stage is clean and focused for live play on every platform.
7. Drafts must look like drafts.
8. State must be visible.

**Ceremonial vocabulary:** "Saga" replaces user-facing "Campaign" for the playable campaign/storyline. Workspace and World are structural containers; no separate Campaign layer is added.

---

## 15. Validation Assumptions

Validate before scaling development:

1. AI scaffolding feels specific and playable, not generic.
2. A GM can reach a credible first-session packet in 10–20 minutes via Build with AI.
3. AI-generated prep saves meaningful time.
4. Post-session review is faster than writing notes from scratch.
5. Phone audio at a game table produces a usable transcript.
6. GMs are willing to record, upload, paste, or summarize.
7. Relic feels like one connected workflow, not a feature bundle.
8. Search is faster than existing notes.
9. GMs trust that drafts are drafts and canon changes only by approval.

---

## 16. MVP Success Metrics

**Activation:** signup-to-scaffold time · scaffold-to-first-packet time · % approving at least one AI draft · % creating or prepping a session.

**Session usage:** Stage usage rate · pinned card usage · search success · quick capture usage · recording or notes submission rate.

**Post-session:** recording-to-summary completion · notes-to-summary completion · draft approval rate · edits per approved draft · time saved vs. manual notes.

**Retention:** return for second session · return for three consecutive sessions · completion of one full loop · prep generated from prior session consequences.

**Trust:** hallucination severity · rejection reasons · accidental canon mutation incidents · GM confidence in draft/canon distinction · export and data-trust sentiment.

---

## 17. Pricing and Rate-Limit Position

Locked for MVP by `[[25 - Pricing and Rate Limits]]`. Pricing remains a hypothesis, but usage enforcement is no longer open-ended.

| Tier | Role |
|---|---|
| Alpha Invite | Private validation with generous soft caps and admin override. |
| Free | Public/free beta entry point with hard caps. |
| Standard | First paid hypothesis once billing is enabled. |
| Power | V1+ tier for heavier usage and advanced controls. |

**Implementation rule:** quotas attach to `workspace_id`. Events also carry `world_id` and `saga_id` where applicable. MVP builds upgrade/request-capacity surfaces, but not full Stripe billing.

---

## 18. V1 Direction

After the GM loop is validated, V1 expands toward:

1. Player-facing publishing — recap publishing, read-only player wiki, shareable saga link, published entity pages, preview-as-player, GM-only/published binary visibility.
2. Game System binding — saga binds to zero or one system; pre-shipped schemas for common systems; nullable V0 schema fields prevent a rewrite.
3. Rulebook RAG — uploaded rulebook PDFs form a saga-local rules corpus used by `derive_system_schema`, context-aware generators, and GM-invoked rules search.
4. System-aware Stage affordances — Mechanical Strips on Stage Cards, lightweight initiative scene tracker, per-PC dashboard when a Game System is bound.
5. Context-aware generators — `generate_from_context` produces a single GM-invoked candidate (monster, treasure, NPC, plant, weather) that can be dismissed or saved through approval.
6. Better imports — PDF + RAG, Obsidian vaults, Notion/World Anvil/Kanka research.
7. Richer visualization — World History / Era Timeline, basic map upload and pins, writable timeline events, read-only relationship graph / Constellation, Entity Neighborhood, Thread Map, and Session Web.
8. More powerful AI controls — BYOK settings, custom AI tone per saga, contradiction detection, speaker diarization, optional real-time transcription.
9. Granular continuity review primitives — paragraph-level track-changes inside the Approval Queue editor.
10. Notification depth — web push, per-saga subscription preferences, batched/digest notifications.

---

## 19. Open Questions

Resolved in v3.0–v3.3: see prior changelogs.

**Still open:**

- Mobile adaptation details after the web app proves the full Sanctum/Stage loop.
- App Store / TestFlight / Expo preview sequencing after web alpha.
- Paste-cap value beyond MVP (currently 50,000 chars at PRD level).

---

## 20. Active Companion Documents

**Locked / active for MVP implementation:**

1. ✅ **MVP PRD** — `[[12 - MVP PRD]]`.
2. ✅ **Entity & Canon Schema** — `[[20 - Entity and Canon Schema]]`.
3. ✅ **AI Task Registry** — `[[23 - AI Task Registry]]` is standalone for MVP task contracts after the v1.0 base-contract rewrite.
4. ✅ **Memory & Retrieval Spec** — `[[22 - Memory and Retrieval]]`.
5. ✅ **Approval Queue Spec** — `[[24 - Approval Queue]]`.
6. ✅ **Technical Architecture Spec** — `[[21 - Tech Architecture]]`.
7. ✅ **Stage UX Flow** — `[[32 - Stage UX Flow]]`.
8. ✅ **Sanctum UX Flow** — `[[30 - Sanctum UX Flow]]`.
9. ✅ **Session Prep Flow** — `[[31 - Session Prep Flow]]`.
10. ✅ **First-Run UX Flow** — `[[33 - First Run UX Flow]]`.
11. ✅ **UI Implementation Spec** — `[[34 - UI Implementation Spec]]`.
12. ✅ **Pricing & Rate Limits Spec** — `[[25 - Pricing and Rate Limits]]`.

**Still required before full MVP scope expansion:**

1. **AI implementation-plan review** — required before coding AI task surfaces from [[23 - AI Task Registry]].
2. **Game System Spec** — V1 parking-lot deliverable, not an MVP blocker.

---

## 21. Operating Rule

When making any product, UX, or architecture decision, optimize for the GM loop:

> Create → Organize → Prep → Run → Review → Approve → Continue.

If a feature does not make that loop faster, clearer, more trustworthy, or more delightful for the GM, it does not belong in the MVP. If a workflow is core to the loop, it must have a functional path on both web and mobile, even when one platform is clearly optimized for it.
