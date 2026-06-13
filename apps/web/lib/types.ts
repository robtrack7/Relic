export type IdParams = {
  workspaceId: string;
  worldId: string;
  sagaId: string;
};

export type EntityType = "character" | "place" | "faction" | "artifact" | "thread" | "session" | "note";
export type CanonEntityType = Exclude<EntityType, "note">;
export type EntityScope = "saga" | "world";
export type SessionStatus = "planned" | "ready" | "started" | "in_progress" | "ended_pending_undo" | "ended";

export type EntitySummary = {
  id: string;
  entityType: EntityType;
  workspace_id: string;
  world_id: string;
  saga_id: string | null;
  scope: EntityScope;
  name: string;
  summary: string | null;
  narrative?: string | null;
  gm_notes?: string | null;
  canon_state: "canon" | "archived";
  is_stub?: boolean;
  status?: string;
  objectives_log?: unknown[];
  updated_at?: string;
};

export type AppContext = {
  workspace: { id: string; name: string; usage_limits?: Record<string, unknown> } | null;
  world: { id: string; name: string; summary?: string | null } | null;
  saga: { id: string; name: string; game_system?: string | null; premise?: string | null } | null;
  session: { id: string; name: string; status: SessionStatus } | null;
  gm_profile: Record<string, unknown> | null;
  resumable_workshop_session: Record<string, unknown> | null;
  needs_new_saga: boolean;
};

export type SearchResult = {
  source_kind: string;
  source_entity_type: EntityType | null;
  source_entity_id: string;
  snippet: string;
  rrf_score: number;
  canon_state: "canon" | "archived";
  is_stub: boolean;
};
