export type IdParams = {
  workspaceId: string;
  worldId: string;
  sagaId: string;
};

export type HierarchyOption = {
  id: string;
  name: string;
  target: IdParams | null;
};

export type HierarchyContext = {
  switching_blocked?: boolean;
  workspaces: HierarchyOption[];
  worlds: HierarchyOption[];
  sagas: HierarchyOption[];
};

export type EntityType = "character" | "place" | "faction" | "artifact" | "thread" | "session" | "note";
export type CanonEntityType = Exclude<EntityType, "note">;
export type EntityScope = "saga" | "world";
export type SessionStatus = "planned" | "ready" | "started" | "in_progress" | "ended_pending_undo" | "ended";

export type PrepPinState = "available" | "archived" | "missing" | "permission_denied";
export type SessionPrepPin = {
  key: string;
  entity_type: EntityType;
  entity_id: string;
  name: string;
  state: PrepPinState;
  order_index: number;
  summary?: string | null;
  objectives_log?: unknown[];
  resolution_state?: "active" | "dormant" | "resolved" | "failed";
};
export type SessionPrepData = {
  session: {
    id: string;
    name: string;
    session_number?: number | null;
    status: string;
    objective?: string | null;
    opening_scene?: string | null;
    scene_notes?: string | null;
    prep_checklist?: Array<{ text: string; done?: boolean }>;
    planned_start_at?: string | null;
    updated_at?: string;
  };
  pinned_entities: SessionPrepPin[];
  active_threads: SessionPrepPin[];
  options: { entities: SessionPrepPin[]; threads: SessionPrepPin[] };
  prior_summary: { state: "approved" | "fallback" | "none"; session_name: string | null; text: string };
};

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
  resolution_state?: "active" | "dormant" | "resolved" | "failed";
  resolution_details?: string | null;
  updated_at?: string;
};

export type LibraryProvenanceEntry = {
  id: string;
  operation: string;
  actor_kind: string;
  from_state: string | null;
  to_state: string | null;
  created_at: string;
  sources: Array<{ id: string; kind: string; excerpt: string | null; created_at: string }>;
};

export type LibraryRelationship = {
  link_type: "relationship" | "note_attachment";
  id: string;
  kind: string;
  notes: string | null;
  direction: "inbound" | "outbound";
  related_type: EntityType;
  related_id: string;
  related_name: string;
  related_archived?: boolean;
  created_at: string;
};

export type ThreadObjective = {
  id: string;
  text: string;
  state: "open" | "completed";
  completed_at: string | null;
  order_index: number;
  created_at?: string;
};

export type ThreadDetail = {
  record: Omit<EntitySummary, "entityType" | "objectives_log"> & {
    entityType: "thread";
    resolution_state: "active" | "dormant" | "resolved" | "failed";
    resolution_details: string | null;
    objectives_log: ThreadObjective[];
  };
  relationships: LibraryRelationship[];
  candidates: LibraryCandidate[];
};

export type ThreadTimelineEntry = {
  event_id: string;
  thread_id: string;
  objective_id: string | null;
  session_id: string | null;
  session_number: number | null;
  session_name: string | null;
  event_type: string;
  title: string;
  detail: string;
  occurred_at: string;
  source_type: string;
  source_id: string;
};

export type LibraryMention = {
  id: string;
  state: "suggested" | "accepted" | "dismissed" | "snoozed";
  mention_text: string;
  related_type?: EntityType;
  related_id?: string;
  related_name?: string;
  source_type?: EntityType;
  source_id?: string;
  source_name?: string;
  snoozed_until?: string | null;
  updated_at: string;
};

export type LibraryCandidate = {
  entityType: EntityType;
  id: string;
  name: string;
  scope: EntityScope;
};

export type LibraryRecordDetail = {
  record: EntitySummary;
  provenance: LibraryProvenanceEntry[];
  relationships: LibraryRelationship[];
  mentions: LibraryMention[];
  backlinks: LibraryMention[];
  candidates: LibraryCandidate[];
  delete_blockers: Record<string, number> & { total: number };
  can_hard_delete: boolean;
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

export type StageLiteralSearchDocument = {
  source_kind: string;
  source_entity_type: EntityType | null;
  source_entity_id: string;
  name: string;
  summary: string | null;
  narrative: string | null;
  canon_state: "canon" | "archived";
  is_stub: boolean;
  updated_at: string;
};
