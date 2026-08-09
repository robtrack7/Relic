# Figma UI import

Use this guide only when adapting a Figma or Claude visual export into `apps/web`. Read `Relic Vault/00 - Start Here.md` and `30 - Experience Contract.md` first.

1. Import one route or reusable component family at a time.
2. Keep the authenticated route hierarchy, server loaders, server actions, and Supabase RPC boundary intact.
3. Convert generated static JSX into typed presentational components; replace sample data with existing loaders and props.
4. Reuse existing tokens and CSS variables before adding a token. Treat exported bundles as visual reference, not application architecture.
5. Preserve Workspace/World/Saga scope, GM approval for canon, manual recovery, and safe empty/loading/error/permission states.
6. Add focused tests for visible state and action wiring. For substantial visual work, run lint, unit tests, production build, and a browser screenshot pass.

Useful seams:

- `apps/web/components/SanctumShell.tsx` — authenticated shell
- `apps/web/lib/data.ts` — scoped read loaders
- `apps/web/app/actions.ts` — server mutations
- `apps/web/lib/routes.ts` — hierarchy-safe route helpers
- `apps/web/app/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]` — authenticated routes
