---
status: active
authority: support
scope: session-log
read_after:
  - "[[50 - Session Log Index]]"
depends_on:
  - "[[00 - Start Here]]"
supersedes: []
last_audited: 2026-06-02
source_file: "Relic Vault/Session Logs/2026-06-02 - Wireframe Design Implementation and Icons.md"
---

# 2026-06-02 - Wireframe Design Implementation and Icons

Backlink: [[50 - Session Log Index]]

## Accomplished

- Appended the full wireframe component CSS system (`relic.css`, ~630 lines) from the Relic Web Draft to `apps/web/app/globals.css`. This brings in all missing wireframe classes: `.home-grid`, `.entity-grid`, `.entity-card`, `.packet`, `.threads-layout`, `.sess-row`, `.stage-shell`, `.float-btn`, `.review-layout`, `.loom-carriage`, etc. Token names mapped: `--r-sm/md/lg → --radius-sm/md/lg`.
- Created `apps/web/components/RelicIcon.tsx` — a typed Lucide wrapper mapping 26 named icons to `lucide-react` components (already installed, v0.561.0).
- Rewrote `SanctumShell.tsx` to adopt the wireframe's `.relic`, `.topbar`, `.sidenav`, `.nav-item`, `.loom-carriage` structure with Lucide icons in all nav items and topbar controls.
- Rewrote `SanctumDashboardDraft.tsx` using wireframe's `.home-grid`, `.list-card`, `.th-row`, `.packet`, `.packet-tiles`, `.tile`, `.cta-stage`, `.live-banner` pattern.
- Rewrote `PrepareWorkspaceDraft.tsx` using `.prep-grid`, `.mini-card`, `.kv`, `.cl-item`, `.packet-card`, `.detail-tiles`, `.prep-cta`, `.cta-stage` with Lucide icons.
- Rewrote `StageRuntimeDraft.tsx` using `.stage-shell`, `.stage-topbar`, `.stage-body`, `.pinned-strip`, `.entity-expanded`, `.float-btn`, `.stage-loom` with icons and the 3-column entity detail panel.
- Ported all 10 route pages to wireframe classes:
  - Sessions list/new: `.sess-list`, `.sess-row`, `.sess-num`, `.packet-card`
  - Threads list/detail: `.threads-layout`, `.tl-card`, `.tl-filters`, `.tl-row`, `.t-chip`, `.td-card`, `.obj-row`
  - Library list/detail/new: `.lib-filters`, `.entity-grid`, `.entity-card`, `.e-npc/location/faction/artifact`, `.lib-detail-layout`, `.entity-main`
  - Review: `.review-layout`, `.rq-card`, `.rq-item`, `.rq-dot`, `.diff-block`, `.source-dock`
  - Search: `.search-palette`, `.sp-row` with entity-type color bars
  - Settings: `.settings-layout`, `.setting-row`, `.danger-zone`
- Fixed three test regressions introduced by the refactor (heading roles, checkbox aria-labels, duplicate End Session button).

## Files Changed

- `apps/web/app/globals.css` — appended wireframe CSS
- `apps/web/components/RelicIcon.tsx` — new file
- `apps/web/components/SanctumShell.tsx`
- `apps/web/components/relic-draft/SanctumDashboardDraft.tsx`
- `apps/web/components/relic-draft/PrepareWorkspaceDraft.tsx`
- `apps/web/components/relic-draft/StageRuntimeDraft.tsx`
- `apps/web/app/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]/sessions/page.tsx`
- `apps/web/app/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]/sessions/new/page.tsx`
- `apps/web/app/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]/threads/page.tsx`
- `apps/web/app/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]/threads/[threadId]/page.tsx`
- `apps/web/app/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]/entities/page.tsx`
- `apps/web/app/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]/entities/new/page.tsx`
- `apps/web/app/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]/entities/[entityType]/[entityId]/page.tsx`
- `apps/web/app/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]/review/page.tsx`
- `apps/web/app/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]/search/page.tsx`
- `apps/web/app/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]/settings/page.tsx`

## Verification

- `npx pnpm@10.11.0 --filter @relic/web lint` — clean
- `npx pnpm@10.11.0 --filter @relic/web test` — 16/16 tests pass
- `npx pnpm@10.11.0 --filter @relic/web build` — clean, all 17 routes compile

## Follow-ups

- Browser screenshot pass across all screens pending (Chrome extension disconnected during session).
- The Loom sidecar prompt buttons and AI composer are visible but disabled — correct per AI runtime boundary.
- Context switcher dropdowns in topbar are placeholder buttons — wiring to actual workspace/world/saga switching is a V1 feature.
- Stage entity-expanded 3-column panel shows first pinned entity only; interactive selection (click pinned card to switch) requires client state and is a follow-up.
- `EntityCard` component in `components/EntityCard.tsx` is now superseded by the inline entity card in `entities/page.tsx` — consider removing or unifying.
