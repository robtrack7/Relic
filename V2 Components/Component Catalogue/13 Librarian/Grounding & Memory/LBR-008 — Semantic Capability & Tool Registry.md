---
id: LBR-008
status: active
kind: domain
authority: current
system: SYS-13
family: grounding-memory
storybook: none
depends_on:
- LBR-009
- LBR-010
- PLT-010
---

# LBR-008 — Semantic Capability & Tool Registry

Parent: [[SYS-13 — Librarian]]

## Purpose

Defines product-semantic capabilities the Librarian can invoke without exposing raw infrastructure, pixel coordinates, SQL, credentials, or unrestricted mutation.

## Capability families

**Navigation** — open/Focus object, locate on Canvas, open Source/page, open Session.

**Canvas** — create/move/group/arrange Placements, create Board Section, show semantic Relationship, switch Board.

**World** — create/edit/archive allowed World Objects, create/end/edit Relationships.

**Session** — add/remove prepared references, create/reorder Scene/Beat, create Session Instance, add/remove Encounter Participant, change Encounter Flow, capture Fragment.

**Settlement** — revise Story Change, settle allowed changes, resolve Session Instance, revert/correct settlement.

**Retrieval** — search, retrieve Source, inspect temporal history, retrieve rules reference.

## Semantic abstraction

The Librarian requests intent-level operations such as `Arrange these Characters by faction.` The application owns geometry, snapping, collision, validation, permissions, and persistence.

## Permissions and authority

Every capability remains subject to RLS/authorization, [[LBR-009 — Intent, Authority & Autonomy Gate]], current scope, temporal/version validation, and protected-action policy.

## Relationships

- [[LBR-009 — Intent, Authority & Autonomy Gate]]
- [[LBR-010 — Action Planning & Change Sets]]
- future backend/tool execution layer

## Platform executor owner

Registered tools are implemented/validated through [[PLT-010 — Librarian Task Runtime & Semantic Tool Executor]]. Models never gain direct SQL/database authority.

## Handoff

Implement **LBR-008 — Semantic Capability & Tool Registry** as the bounded semantic API the model can plan over.
