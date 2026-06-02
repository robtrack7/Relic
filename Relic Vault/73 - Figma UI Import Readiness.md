---
status: active
authority: secondary
scope: mvp-design
read_after:
  - "[[60 - Design Spec Overview]]"
depends_on:
  - "[[13 - Design System]]"
  - "[[34 - UI Implementation Spec]]"
  - "[[60 - Design Spec Overview]]"
  - "[[71 - Component Inventory Design Spec]]"
  - "[[72 - Navigation Design Spec]]"
supersedes: []
last_audited: 2026-06-02
source_file: "Relic Vault/73 - Figma UI Import Readiness.md"
---

# Figma UI Import Readiness

This note defines the handoff contract for bringing Figma React output into the Relic web app. It is a bridge between editable Figma wireframes and backend-wired Next.js implementation. It does not replace [[34 - UI Implementation Spec]], [[71 - Component Inventory Design Spec]], or the screen specs listed in [[60 - Design Spec Overview]].

## Current Readiness

The web project is ready for a controlled Figma import, not a blind paste-over.

Ready foundations:

- Next.js App Router is already in place under `apps/web/app`.
- Shared Relic tokens, fonts, palette, shell classes, and Stage/Sanctum styling already live in `apps/web/app/globals.css`.
- `SanctumShell` already owns the authenticated top context bar, left rail, Review count, current session pill, and Loom sidecar.
- Server-side loaders in `apps/web/lib/data.ts` already read Workspace/World/Saga context, canon records, sessions, pinned entities, active Threads, drafts, usage, and search through Supabase RPCs.
- Server actions in `apps/web/app/actions.ts` already protect manual create/update/session/stage/review behavior.
- Tests cover route hierarchy guards, auth env behavior, shell navigation, Stage helpers, entity behavior, and manual data/action surfaces.

Known integration gaps to handle during import:

- Some page UI is still embedded directly in route files rather than separated into presentational components.
- Figma-generated React should be treated as visual reference code. It will likely need adaptation for Next server components, existing route params, server actions, accessible form behavior, and backend state.
- Top context switchers, global create, Relic Guide, and some Stage controls are visual placeholders or partial shells until their backing flows are implemented.
- Every imported AI-adjacent element must preserve the canon rule: AI output is not canon until explicit GM review, direct GM action, or Approval Queue commit.

## Import Rule

Bring Figma over one route or component family at a time. Do not replace the whole app shell or multiple workflow screens in one pass.

Each import unit needs:

1. Figma node-specific URL.
2. Target route or component.
3. Owning canonical screen spec.
4. Required loader data and server actions.
5. Empty, loading, error, quota, conflict, offline, and disabled states where the owning spec requires them.
6. Test or smoke check proving the backend contract still works.

## Route Mapping

| Figma area | Primary route/component | Owning specs | Backend/data contract |
|---|---|---|---|
| App shell / navigation | `apps/web/components/SanctumShell.tsx` | [[71 - Component Inventory Design Spec]], [[72 - Navigation Design Spec]] | Workspace/World/Saga context, current session, Review count, sign out |
| Sanctum dashboard | `apps/web/app/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]/page.tsx` | [[61 - Sanctum Dashboard Design Spec]] | `requireSagaContext`, `getSessions`, `getRecentEntities`, `getPendingDrafts`, session create action |
| Prepare workspace | `.../sessions/[sessionId]/prep/page.tsx` | [[65 - Session Prep Design Spec]] | session read/update, active Threads, pinned entities, Ready for Stage |
| Stage | `.../sessions/[sessionId]/stage/page.tsx` | [[66 - Stage Design Spec]] | session status, packet fields, pinned entities, active Threads, Stage search, quick capture, quick stub, Mark Moment, End Session |
| Threads | `.../threads` and `.../threads/[threadId]` | [[64 - Unified Library Detail Design Spec]], [[72 - Navigation Design Spec]] | thread list/detail, objectives log, related entities, read-only timeline |
| Library | `.../entities`, `.../entities/new`, `.../entities/[entityType]/[entityId]` | [[64 - Unified Library Detail Design Spec]] | list/detail/create/update/archive, provenance placeholders, route hierarchy |
| Review | `.../review` | [[67 - Approval Queue Design Spec]] | pending drafts, approve/edit/reject/merge/archive actions, source and conflict states |
| Search and Relic Guide | `.../search`, shell sidecar | [[68 - Ask Search Design Spec]] | literal search now; AI actions require Registry-backed runtime and approval boundaries |
| Settings and export | `.../settings`, future `.../export` | [[69 - Settings Usage Design Spec]] | usage summary, retention/settings actions, export lifecycle |

## Backend Wiring Checklist

For each imported screen, audit before commit:

- Route params preserve `workspaceId`, `worldId`, and `sagaId`; sibling Saga IDs are never accepted silently.
- Server component loaders remain the source of initial data.
- Mutations use existing server actions or new actions backed by scoped RPCs.
- No client component receives service-role secrets, provider keys, or direct database credentials.
- Manual workflows still work when AI, quota, transcription, export, or network-dependent work is unavailable.
- Canon-mutating UI uses direct GM action, inline review, or Approval Queue; it never writes hidden canon.
- Source/provenance is visible for AI drafts, review items, cited answers, prep briefing, and transcript-derived changes.
- Disabled and error states explain what is safe, not only what failed.
- Imported styles reuse Relic CSS variables, fonts, radii, and shell density before adding new tokens.

## Recommended Process

1. Ask for a node-specific Figma URL for the first frame, not only the file URL.
2. Pull design context and screenshot from Figma for that node.
3. Compare the frame to the owning spec and the current route implementation.
4. Extract static JSX into presentational components first, keeping existing loaders/actions intact.
5. Replace hard-coded Figma sample data with typed props from `apps/web/lib/data.ts`.
6. Wire forms and controls to server actions.
7. Add or update focused tests for route links, visible states, and action wiring.
8. Run `npx pnpm@10.11.0 --filter @relic/web lint`, `npx pnpm@10.11.0 --filter @relic/web test`, and `npx pnpm@10.11.0 --filter @relic/web build`.
9. Use a browser screenshot pass for any route with substantial visual change.
10. Update the session log with changed files, verification, and open follow-ups.

## Figma Review Checklist

Before implementation, reject or revise any wireframe region that:

- Treats Stage as a default left-rail item.
- Treats Relic Guide as an autonomous permanent chatbot column.
- Makes AI suggestions look like canon.
- Hides Workspace/World/Saga scope.
- Omits Review/source/provenance for draft-backed changes.
- Adds MVP-excluded features such as initiative tracking, encounter tracking, VTT, player wiki, maps, writable timeline, relationship graph, BYOK, local model settings, or image generation.
- Replaces Library with an Entities-only mental model.
- Makes session prep look like a third top-level product surface instead of a Sanctum workflow.

