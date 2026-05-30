---
status: active
authority: secondary
scope: mvp-design
read_after:
  - "[[60 - Design Spec Overview]]"
depends_on:
  - "[[25 - Pricing and Rate Limits]]"
  - "[[30 - Sanctum UX Flow]]"
  - "[[21 - Tech Architecture]]"
  - "[[34 - UI Implementation Spec]]"
supersedes: []
last_audited: 2026-05-30
source_file: "Relic Vault/69 - Settings Usage Design Spec.md"
---

> [!info] How to use this spec
> Use this for Saga, World, Workspace, retention, export, and usage settings. Read with [[60 - Design Spec Overview]] and [[71 - Component Inventory Design Spec]]. Upstream behavior lives in [[25 - Pricing and Rate Limits]], [[30 - Sanctum UX Flow]], [[21 - Tech Architecture]], and [[34 - UI Implementation Spec]].

# Settings Usage Design Spec

## 1. Purpose

Settings and Usage let the GM control Saga metadata, retention choices, export, account/session preferences, and quota visibility without turning Relic into an admin console.

The MVP goal is clear control and cost trust, not full billing management.

## 2. Page synthesis

This screen draws from [[25 - Pricing and Rate Limits]] for quota/readout behavior, [[30 - Sanctum UX Flow]] for Saga settings, [[21 - Tech Architecture]] for retention/export implications, and [[34 - UI Implementation Spec]] for routes.

Settings should respect the Workspace/World/Saga hierarchy: Workspace owns usage and future billing; World owns shared setting context; Saga owns active play settings.

## 3. User mental model

The GM thinks: "I can change the active Saga's practical settings, understand usage limits, control retention, export my data, and sign out."

They are not configuring AI providers or complex collaboration. They expect plain language and safe confirmations.

## 4. Primary user jobs

- Rename/update Saga basics and game system text.
- Adjust per-Saga GM profile override.
- Set audio/transcript retention preferences.
- View Workspace usage and quota reset/limits.
- Export Markdown/JSON.
- Manage notification preferences where available.
- Sign out or access account basics.

## 5. Primary action

Settings pages mostly use autosave for non-destructive fields. For sensitive actions, primary actions are explicit: `Export data`, `Delete transcript`, `Delete saga`, or `Sign out`, each with appropriate confirmation.

Usage has no primary purchase flow in MVP unless an upgrade placeholder is already defined upstream. It should explain limits and reset timing.

## 6. Secondary actions

Secondary actions include reset Saga profile override, retry failed export, download completed export, view recoverable failed transcription/audio state, pause notifications, open usage details, and return to dashboard.

## 7. Layout structure

Use Sanctum shell. Desktop settings can use a left settings subnav with panels: Saga, World, Workspace usage, Retention, Notifications, Export, Account. Keep World settings lightweight and avoid a full World dashboard.

Main panels should be framed with Cream cards on Parchment. Put dangerous actions low on the page in Rust-bordered containment. Mobile uses stacked sections with accordions or simple route tabs.

Use scope headers to prevent accidental edits in the wrong container. Saga panels should show active Saga and World. Workspace usage should clearly say usage is measured at Workspace level even when events carry World and Saga context. Retention panels should distinguish audio, transcript, and export retention because each has different consequences.

## 8. Key components

- Navigation: `SettingsSubnav`, `ScopeHeader`, `ContextSwitcher`.
- Inputs: `SettingsTextField`, `SelectField`, `RetentionToggleGroup`, `ProfileOverrideCard`, `NotificationPreferenceList`.
- Data/status: `UsageSummaryCard`, `QuotaMeter`, `ResetDateLabel`, `ExportStatusCard`, `RetentionStateChip`.
- Actions: `ExportRequestButton`, `DownloadExportButton`, `DeleteConfirmDialog`, `SignOutButton`.
- Feedback: `AutosaveIndicator`, `QuotaBlockedExplanation`, `RecoverableAudioWarning`, `PermissionErrorState`.

See [[71 - Component Inventory Design Spec]].

## 9. Required states

Required states: loading settings, autosaving, saved, offline queued, validation failure, usage near quota, quota reached, export requested, export processing, export ready, export expired, export failed, retention delete confirmation, transcript delete confirmation, saga delete blocked by in-progress session, notification preference saved, permission denial, account sign-out.

Quota blocked must preserve manual workflows and explain what is blocked: AI, transcription, import, export, storage, or create limits.

## 10. AI behavior

No AI generation belongs in Settings. Usage may list AI credits or task categories, but there are no model/provider controls in MVP. Do not expose BYOK UI, local model settings, per-model selection, prompt tuning, or custom AI tone settings.

If a quota message originates from an AI surface, Settings may explain the quota category and reset timing, but it should route the GM back to the original manual workflow rather than presenting Settings as a required detour.

## 11. Source/provenance behavior

Settings rarely need source provenance. Export should show schema/version metadata and what is included/excluded. Retention deletes need clear consequences. Usage should show metered categories in human units and reset dates.

Where a setting affects future processing, state the next effect plainly. For example, audio retention changes apply to future completed transcription cleanup; they should not imply that already-deleted audio can be restored. Export status should show request time, expiry time, and whether the file includes canon, drafts, transcripts, sources, and audit metadata according to the active export contract.

## 12. Navigation in

Users arrive from shell Settings, usage chip, quota-blocked states, export links, notification taps, account menu, or failed pipeline/transcription recovery surfaces.

## 13. Navigation out

Users return to dashboard, Usage detail, export download, sign-in after sign-out, or specific Saga/World context via switcher.

## 14. Components to avoid

Avoid full Stripe billing setup, BYOK UI, local model settings, player permissions, co-GM collaboration settings, custom calendars, Era editor, full World dashboard, plugin marketplace, and advanced AI tuning.

## 15. Visual tone

Restrained, clear, and administrative without feeling corporate. Use simple labels, explicit consequences, and low visual drama except for destructive actions and quota blocks.

## 16. Claude Design prompt

```text
Create Relic's Settings and Usage screens inside The Sanctum. Include Saga settings, lightweight World settings, Workspace usage, retention, notifications, export, and account/sign out. Show quota meters, reset dates, export lifecycle states, autosave, and destructive confirmations. Keep Workspace/World/Saga hierarchy clear. Use Relic parchment/cream editorial styling. Do not include BYOK, local model settings, full billing setup, player permissions, co-GM collaboration, custom calendars, Era editor, full World dashboard, plugin marketplace, or image generation.
```
