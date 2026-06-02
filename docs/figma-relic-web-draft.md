# Relic Web Draft Figma Make Import

Source: https://www.figma.com/make/kwXq2Q9Wd8vN2x352V4LWI/Relic-Web-Draft?t=1Fs2PKRgiaoTuyLN-6

The Figma connector accessed the Make file and exported the source bundle locally under:

`Claude Design - Relic Design System/Relic Web Draft/`

Treat that folder as the read-only visual/source reference for implementation. Adapt from it into `apps/web` route by route rather than importing its Vite app wholesale.

## Figma Make Source Manifest

Relic-specific app files advertised by the Make bundle:

- `src/app/App.tsx`
- `src/app/components/relic/AppContext.tsx`
- `src/app/components/relic/ExportSettings.tsx`
- `src/app/components/relic/Home.tsx`
- `src/app/components/relic/Library.tsx`
- `src/app/components/relic/Overview.tsx`
- `src/app/components/relic/Prepare.tsx`
- `src/app/components/relic/Primitives.tsx`
- `src/app/components/relic/Review.tsx`
- `src/app/components/relic/Sessions.tsx`
- `src/app/components/relic/Shell.tsx`
- `src/app/components/relic/Stage.tsx`
- `src/app/components/relic/Threads.tsx`

Style files advertised by the Make bundle:

- `src/styles/fonts.css`
- `src/styles/globals.css`
- `src/styles/index.css`
- `src/styles/relic.css`
- `src/styles/tailwind.css`
- `src/styles/theme.css`

Wireframe import files advertised by the Make bundle:

- `src/imports/Relic_Wireframes.html`
- `src/imports/wf-bits.jsx`
- `src/imports/wf-shell.jsx`
- `src/imports/wf-styles.css`
- `src/imports/wf-surfaces-1.jsx`
- `src/imports/wf-surfaces-2.jsx`
- `src/imports/wf-surfaces-3.jsx`
- `src/imports/wf-surfaces-4.jsx`

## Local Import Strategy

The first local import pass starts with the authenticated Sanctum dashboard because it already has backend loaders and a safe manual session-create action. The route now mounts a local `SanctumDashboardDraft` presentational component that adapts the draft dashboard direction while preserving backend wiring.

Backend contract preserved:

- `requireSagaContext`
- `getSessions`
- `getRecentEntities`
- `getPendingDrafts`
- `createSessionAction`
- `SanctumShell`

The Figma draft should be adapted into local presentational components route by route. Generated UI code should not replace Supabase loaders, server actions, route hierarchy checks, or canon approval boundaries.

Next source files to adapt:

- `src/app/components/relic/Shell.tsx` -> `apps/web/components/SanctumShell.tsx`
- `src/app/components/relic/Prepare.tsx` -> authenticated prep route
- `src/app/components/relic/Stage.tsx` -> authenticated Stage route
- `src/app/components/relic/Library.tsx` and `Threads.tsx` -> authenticated library/thread routes
- `src/app/components/relic/Review.tsx` -> Approval Queue route
