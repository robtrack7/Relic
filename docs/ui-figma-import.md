# Figma UI Import Guide

Use this when bringing Relic's Figma React output into `apps/web`.

The project is ready for a controlled import. It is not ready for a full paste-over of generated React. Keep the backend-wired Next.js routes and adapt the Figma output into presentational components, one route or component family at a time.

## Canonical References

- `Relic Vault/00 - Start Here.md`
- `Relic Vault/13 - Design System.md`
- `Relic Vault/34 - UI Implementation Spec.md`
- `Relic Vault/60 - Design Spec Overview.md`
- `Relic Vault/71 - Component Inventory Design Spec.md`
- `Relic Vault/72 - Navigation Design Spec.md`
- `Relic Vault/73 - Figma UI Import Readiness.md`

## Current App Seams

- Shared styling: `apps/web/app/globals.css`
- Authenticated shell: `apps/web/components/SanctumShell.tsx`
- Backend loaders: `apps/web/lib/data.ts`
- Route helpers: `apps/web/lib/routes.ts`
- Server actions: `apps/web/app/actions.ts`
- Route pages: `apps/web/app/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]`

## Import Workflow

1. Start with one node-specific Figma URL.
2. Inspect the node screenshot and generated React context.
3. Map the node to one target route or reusable component.
4. Keep existing loaders and server actions in place.
5. Move static visual JSX into a presentational component with typed props.
6. Replace Figma sample data with props from `apps/web/lib/data.ts`.
7. Wire forms to existing server actions or add narrowly scoped actions backed by Supabase RPCs.
8. Reuse existing CSS variables before adding new tokens.
9. Add focused tests for links, visible state, and action wiring.
10. Run lint, tests, build, and a browser screenshot pass for substantial visual changes.

## Backend Audit Questions

- Which Workspace/World/Saga route params does this screen require?
- Which loader reads the data?
- Which server action mutates data?
- What happens with empty, loading, error, quota, conflict, and offline states?
- Does any AI or pipeline output remain non-canon until GM approval?
- Where are source/provenance details shown?
- What manual path still works if AI or metered work is blocked?

## Guardrails

- Do not introduce service-role keys, provider SDKs, prompt templates, or model calls in the web app.
- Do not make Stage a default left-rail destination.
- Do not make Relic Guide an autonomous canon-writing chatbot.
- Do not hide Workspace/World/Saga scope.
- Do not add MVP-excluded navigation or controls.

