---
status: active
authority: secondary
scope: mvp
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[00 - Start Here]]"
supersedes: []
last_audited: 2026-05-18
source_file: "Sourced - Downloaded - 260518/relic-pricing-rate-limits-v0_2.md"
---

> [!info] How to use this spec
> Owns: Alpha/MVP caps, usage metering, quota preflight, hard stops, upgrade surfaces, and abuse controls.
> Does not own: Historical rationale and superseded naming unless explicitly retained as an internal identifier.
> Read next: [[00 - Start Here]]
> Implementation-critical note: Treat this as coding input only after reading the authority order in [[00 - Start Here]].
# Relic Pricing & Rate Limits Spec v0.2

*Created: May 18, 2026. Updated: May 18, 2026.*  
*Purpose: define enforceable alpha/MVP usage limits for AI, transcription, storage, imports, exports, and Workspace/World/Saga scale before coding begins.*

**Source of truth inputs:** `[[11 - Product Basepoint]]`, `[[12 - MVP PRD]]`, `[[20 - Entity and Canon Schema]]`, `[[21 - Tech Architecture]]`, `[[23 - AI Task Registry]]`, `[[34 - UI Implementation Spec]]`

## 0. Scope

This document locks the MVP rate-limit model and alpha pricing hypothesis. It does **not** implement Stripe billing in MVP. It gives engineering enough structure to meter cost drivers, show fair usage language, prevent abuse, and avoid runaway AI/transcription/storage spend.

**Cost drivers:**

1. AI task calls through LiteLLM.
2. Transcription minutes.
3. Embeddings and retrieval fanout.
4. Supabase Storage for audio, imports, attachments, and exports.
5. Background job retries.
6. Export/archive generation.

**Boundary:** limits attach to `workspace_id`. Events also carry `world_id` and `saga_id` when applicable.

---

## Changelog

**v0.2 (May 2026).** Document-control refresh. Adds explicit source-of-truth inputs and aligns references to the current versioned files. No cap values, quota behavior, or tier definitions changed.


## 1. Product tiers

### 1.1 MVP tier names

| Tier | Billing state | Purpose |
|---|---|---|
| Alpha Invite | No billing | Private validation with generous soft caps and admin override. |
| Free | No billing | Public/free beta entry point with hard caps. |
| Standard | Paid hypothesis | First paid tier once billing is enabled. |
| Power | Later | V1+ tier for heavier usage, BYOK, local-model controls, advanced imports. |

### 1.2 Pricing hypothesis

| Tier | Public price hypothesis | Notes |
|---|---:|---|
| Free | $0 | Useful enough to create one real saga and test one short session. |
| Standard | Test at $12–15/month | Designed for one active GM running regular sessions. Final price should wait for alpha cost data. |
| Power | $25–30/month later | Only after V1 features justify it: BYOK UI, advanced import, larger sagas, priority processing. |

**MVP rule:** build upgrade surfaces but not full billing. Upgrade CTAs may say `Request more alpha capacity`, `Join paid beta waitlist`, or `Upgrade coming soon` depending on environment flag.

---

## 2. Plan caps

### 2.1 Workspace, World, Saga, and entity caps

| Limit | Alpha Invite | Free | Standard | Power later |
|---|---:|---:|---:|---:|
| Active Workspaces | 1 | 1 | 1 | 3 |
| Workspace members | 1 GM | 1 GM | 1 GM | V1 co-GM candidate |
| Active Worlds | 3 soft | 1 hard | 5 hard | 15 hard |
| Active Sagas | 10 soft | 1 hard | 10 hard | 40 hard |
| Entities per Saga | 1,000 soft, warn at 500 | 150 hard, warn at 120 | 1,000 hard, warn at 500 | 5,000 hard, warn at 2,000 |
| Notes per Saga | 1,000 soft | 150 hard | 1,500 hard | 7,500 hard |
| Active Sessions per Saga | Unlimited practical, warn at 50 | 10 hard | 100 hard | 500 hard |
| Archived entities | Count toward storage, not entity cap | Count toward storage, not entity cap | Count toward storage, not entity cap | Count toward storage, not entity cap |

**Why one Workspace:** Workspace is the ownership, billing, usage, and future collaboration boundary. MVP is single-GM. Multiple workspaces create collaboration/billing complexity before it is needed.

### 2.2 AI credits

AI credits are a human-facing abstraction over token/cost tiers. Do not expose raw tokens outside internal/debug views.

| Limit | Alpha Invite | Free | Standard | Power later |
|---|---:|---:|---:|---:|
| AI credits / month | 1,000 soft | 100 hard | 1,500 hard | 5,000 hard |
| AI calls / day | 150 soft | 30 hard | 250 hard | 750 hard |
| Concurrent AI jobs / Workspace | 3 | 1 | 3 | 5 |
| Heavy AI jobs / day | 20 soft | 3 hard | 30 hard | 100 hard |

Credit mapping:

| Task class | Credits | Examples |
|---|---:|---|
| Light | 1 | scene beats, thread complication, NPC for scene, Ask, backlink suggestions, quick stub flesh draft |
| Standard | 3 | draft entity from prompt, expand rough notes, compose prep briefing, regenerate one scaffold card |
| Heavy | 10 | scaffold saga, process large pasted notes, synthesize session from manual summary |
| Pipeline synthesis | 15 | post-session transcript-to-summary/update extraction, excluding transcription minutes |
| Re-run pipeline | Same as original | User-triggered retry after successful completion consumes credits again. Failed provider calls do not charge user credits unless usable output was produced. |

### 2.3 Transcription limits

| Limit | Alpha Invite | Free | Standard | Power later |
|---|---:|---:|---:|---:|
| Transcription minutes / month | 900 soft | 60 hard | 600 hard | 2,400 hard |
| Max single recording | 4 hours | 2 hours | 4 hours | 6 hours |
| Concurrent transcription jobs | 1 | 1 | 1 | 2 |
| Queued transcription jobs | 5 | 1 | 5 | 10 |
| Audio retention default | 30 days | 7 days | 30 days | 90 days configurable |
| Transcript retention default | On | On | On | On |

**MVP stance:** async post-session transcription only. Real-time transcription remains excluded.

### 2.4 Storage limits

| Limit | Alpha Invite | Free | Standard | Power later |
|---|---:|---:|---:|---:|
| Total Workspace storage | 10 GB soft | 500 MB hard | 10 GB hard | 50 GB hard |
| Audio storage | Counts toward total | Counts toward total | Counts toward total | Counts toward total |
| Import storage | Counts toward total | Counts toward total | Counts toward total | Counts toward total |
| Export storage | Excluded after TTL purge | Excluded after TTL purge | Excluded after TTL purge | Excluded after TTL purge |
| Export TTL | 7 days | 7 days | 7 days | 14 days |

Storage warning thresholds: 70%, 90%, 100%.

### 2.5 Import and export limits

| Limit | Alpha Invite | Free | Standard | Power later |
|---|---:|---:|---:|---:|
| First-run pasted notes | 50,000 chars | 50,000 chars | 50,000 chars | 100,000 chars candidate |
| `.txt/.md/.markdown` imports / month | 100 soft | 10 hard | 250 hard | 1,000 hard |
| Max single text import | 2 MB | 1 MB | 5 MB | 20 MB |
| `.docx` import | P1 candidate | Not MVP | P1 candidate | Yes if shipped |
| PDF/RAG import | V1 | V1 | V1 | V1 |
| Exports / month | 50 soft | 3 hard | 100 hard | 500 hard |
| Concurrent export jobs | 1 | 1 | 1 | 2 |

---

## 3. Soft warnings vs hard stops

### 3.1 Warning thresholds

Show warnings at:

- 70%: quiet usage chip in Settings and Workspace menu.
- 90%: inline warning near relevant action.
- 100%: hard stop for Free/Standard unless overage/admin override exists.
- 125% Alpha Invite: admin-visible warning; user sees soft warning.
- 150% Alpha Invite: hard stop unless admin override is manually applied.

### 3.2 Hard stops

Hard stop these actions when quota is exhausted:

- New AI call.
- New transcription job.
- New import.
- New export.
- Creating a new Saga/World beyond plan cap.
- Creating a new entity beyond entity cap.
- Uploading more audio/import files beyond storage cap.

Never hard-stop these actions:

- Viewing existing canon.
- Viewing Stage packet.
- Ending an active session.
- Stopping a recording.
- Downloading an existing export before TTL expiry.
- Deleting audio/imports to free storage.
- Approving/rejecting already-created drafts.
- Exporting account data for compliance/data ownership if manually requested.

### 3.3 Grace rules

- If a recording starts while under quota and crosses the monthly minute cap during recording, allow the GM to stop and save. The transcription job may be blocked afterward with clear copy.
- If a pipeline was already queued, let it finish even if the Workspace crosses an AI-credit warning threshold mid-run. Do not strand partially processed sessions.
- If provider retry occurs due to transient provider failure, do not double-charge human-facing credits.

---

## 4. Human-facing quota language

Avoid raw tokens. Use terms that match GM understanding.

| Internal unit | User-facing label | Example copy |
|---|---|---|
| AI credits | AI credits | `You have 18 AI credits left this month.` |
| Transcription seconds | Transcription minutes | `42 transcription minutes left this month.` |
| Storage bytes | Storage | `You are using 420 MB of 500 MB.` |
| Import count | Imports | `10 note imports included this month.` |
| Export count | Exports | `3 exports included this month.` |
| Entity count | Records | `This saga has 120 of 150 records.` |

Blocked copy examples:

- `You have used this month's transcription minutes. You can still upload manual notes or write a session summary.`
- `This saga has reached the Free record limit. Archive unused records or request more alpha capacity.`
- `AI credits reset on June 1. You can keep editing manually.`
- `Storage is full. Delete retained audio or exports to continue uploading.`

Tone: calm, factual, non-punitive. Never shame the GM for usage.

---

## 5. Metering data model

### 5.1 `usage_events`

Append-only usage ledger. Required for alpha.

```sql
create table usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  world_id uuid references worlds(id) on delete set null,
  saga_id uuid references sagas(id) on delete set null,
  actor_gm_id uuid references auth.users(id) on delete set null,
  event_kind text not null, -- ai_call | transcription | storage_upload | import | export | embedding | job_retry | quota_override
  task_name text,
  provider text,
  model text,
  units numeric not null default 0,
  unit_type text not null, -- ai_credit | token | second | byte | count | usd_estimate
  tokens_in int,
  tokens_out int,
  audio_seconds int,
  storage_bytes bigint,
  ai_credits int,
  cost_estimate_usd numeric(10,6),
  idempotency_key text unique,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index on usage_events (workspace_id, created_at desc);
create index on usage_events (workspace_id, event_kind, created_at desc);
create index on usage_events (saga_id, event_kind, created_at desc);
```

### 5.2 `usage_monthly_rollups`

Updated by Edge Function or scheduled job. Source of truth for fast quota checks.

```sql
create table usage_monthly_rollups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  ai_credits_used int not null default 0,
  ai_calls int not null default 0,
  heavy_ai_jobs int not null default 0,
  transcription_seconds_used int not null default 0,
  storage_bytes_current bigint not null default 0,
  imports_used int not null default 0,
  exports_used int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, period_start)
);
```

### 5.3 `quota_overrides`

Admin-only for alpha.

```sql
create table quota_overrides (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  limit_key text not null,
  override_value numeric not null,
  reason text not null,
  expires_at timestamptz,
  created_by_admin_id uuid,
  created_at timestamptz not null default now()
);
```

### 5.4 `workspaces.usage_limits`

`workspaces.usage_limits` stores the effective plan caps snapshot.

Example:

```json
{
  "plan": "alpha_invite",
  "ai_credits_monthly": 1000,
  "transcription_seconds_monthly": 54000,
  "storage_bytes": 10737418240,
  "worlds_active": 3,
  "sagas_active": 10,
  "entities_per_saga": 1000,
  "imports_monthly": 100,
  "exports_monthly": 50,
  "alpha_soft_limit": true
}
```

---

## 6. Enforcement flow

### 6.1 Preflight check

Every metered action calls a shared quota check before work begins.

```ts
type QuotaCheck = {
  allowed: boolean;
  severity: 'ok' | 'warn_70' | 'warn_90' | 'blocked';
  limit_key: string;
  used: number;
  limit: number;
  reset_at?: string;
  message: string;
};
```

### 6.2 Charge event

After completion, write `usage_events` with an idempotency key tied to the job/call ID. Update monthly rollup.

### 6.3 Failed calls

| Failure | User credits? | Internal cost event? |
|---|---:|---:|
| Provider fails before output | No | Yes, `cost_estimate_usd` if charged |
| Provider returns invalid schema and retry succeeds | One charge | Yes for all provider calls |
| User cancels before call starts | No | No |
| User cancels after call starts | Yes if usable output exists | Yes |
| Transcription upload fails before provider call | No minutes | Storage event may exist |
| Transcription provider fails all retries | No human minutes if no transcript | Internal cost event if charged |

---

## 7. Abuse controls and retry limits

### 7.1 Signup and workspace controls

- One Free Workspace per GM account.
- Email verification required before AI/transcription calls.
- New accounts start with conservative daily AI cap until verified.
- Alpha invite codes are single-use.

### 7.2 Rate limits

| Action | Limit |
|---|---:|
| AI calls | 5/minute/Workspace, 30/hour Free, 150/hour Standard |
| Ask calls | 10/hour Free, 100/hour Standard |
| Import jobs | 3/hour Free, 30/hour Standard |
| Export jobs | 3/day Free, 20/day Standard |
| Transcription jobs | 1 concurrent per Workspace in MVP |
| Login attempts | Use Supabase/Auth provider default plus app-level lockout if needed |

### 7.3 Retry limits

| Job | Retry policy |
|---|---|
| AI schema failure | 1 automatic repair attempt, then show editable failure. |
| AI transient provider failure | 2 attempts with backoff. |
| Transcription | 3 attempts, expensive retry warning after second failure. |
| Embedding job | 5 attempts; low user visibility. |
| Import parsing | 2 attempts, then manual paste fallback. |
| Export generation | 3 attempts, then failed export card. |
| Notification | 3 attempts, then mark failed. |

### 7.4 File controls

- Only allow first-run `.txt`, `.md`, `.markdown` in MVP.
- Block executable, archive, binary, and unknown file types.
- Strip metadata from imports where practical.
- Scan file size before upload.
- PDF import remains V1 and must not be quietly accepted.

---

## 8. Upgrade surfaces without full billing

### 8.1 Required surfaces

| Surface | Behavior |
|---|---|
| Workspace menu | Small usage chip when over 70%. |
| Workspace settings → Usage | Full meter table, reset date, plan label. |
| Blocked AI call | Inline quota card with manual alternative. |
| Blocked transcription | Manual notes/session summary fallback. |
| Storage full | Retained audio cleanup CTA. |
| New Saga blocked | Explain plan cap; archive/delete or request capacity. |

### 8.2 MVP CTA variants

Environment flag controls CTA:

| Environment | CTA |
|---|---|
| Private alpha | `Request more alpha capacity` |
| Public beta no billing | `Join paid beta waitlist` |
| Billing enabled | `Upgrade` |

---

## 9. Alpha cohort plan

### 9.1 Cohort shape

Target 20–40 GMs in private alpha.

Recruit for:

- Busy creative GMs.
- New GMs who want structure.
- Worldbuilder GMs with existing notes.
- Improvisational GMs who need post-session capture.
- At least 5 GMs who use a mobile live-session surface at the table.

### 9.2 Alpha limits

Alpha uses Free product UX with Alpha Invite caps. The point is to validate real usage and cost without forcing billing decisions too early.

Admin reviews weekly:

- AI credits used per active GM.
- Transcription minutes per session.
- Average session duration.
- Storage retained per Workspace.
- Pipeline failure/retry cost.
- Draft approval rate by task.
- Conversion willingness at $12–15/month.

### 9.3 Alpha exit criteria

Before public beta, know:

1. Median AI/transcription/storage cost per active GM per month.
2. 90th percentile cost per active GM per month.
3. Average transcription minutes per session.
4. Average sessions per GM per month.
5. Which AI tasks are overused, underused, or too expensive.
6. Whether Standard can include 600 transcription minutes/month without margin risk.
7. Whether Free should include 60 minutes or be notes-only.

---

## 10. Provider price anchors

Provider prices change. Do not hardcode public price assumptions in UI copy. Use this section as a decision note only.

As of May 18, 2026:

- OpenAI transcription anchors are approximately $0.003/minute for mini transcription and $0.006/minute for full transcription.
- Real-time transcription is materially more expensive and remains excluded from MVP.
- LLM text costs vary widely by provider and model; LiteLLM routing must keep task tiers swappable.
- Storage/egress costs are meaningful but should be controlled mainly through retention defaults and export TTL.

Engineering should store actual provider/model/cost estimates on every `usage_events` row and use real alpha data before locking public pricing.

---

## 11. Implementation checklist

- Add `usage_events` table.
- Add `usage_monthly_rollups` table.
- Add `quota_overrides` table.
- Store effective caps in `workspaces.usage_limits`.
- Add shared quota preflight helper.
- Add shared usage event writer with idempotency keys.
- Add quota-aware error states to AI, transcription, import, export, storage upload, and create-Saga/entity flows.
- Add Workspace Settings → Usage page.
- Add admin-only alpha usage dashboard or SQL view.
- Add PostHog events for quota warnings and blocks.
- Do not ship full billing until alpha cost data supports pricing.

---

## 12. Acceptance criteria

- Every AI/transcription/storage/import/export action has a preflight check.
- Usage is metered by Workspace and attributable to World/Saga when applicable.
- Free tier hard caps are enforceable.
- Alpha soft caps are visible and admin-overridable.
- The GM always gets a manual fallback when AI/transcription is blocked.
- Upgrade surfaces exist without requiring Stripe.
- No raw token accounting appears in normal user UI.
- Public pricing remains hypothesis until alpha cost data is reviewed.

---

*End of Pricing & Rate Limits Spec v0.2.*



