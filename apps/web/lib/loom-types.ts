import type { DraftCitationContext } from "@/lib/types";

export type GuideCitation = {
  sourceId: string;
  context: DraftCitationContext;
};

export type LoomReadRecord = {
  recordType: string;
  recordId: string;
  name: string;
  status?: string;
  summary?: string;
  href: string;
};

export type LoomReadSnapshot = {
  record?: LoomReadRecord;
  relationships?: Array<LoomReadRecord & { kind: string; direction: string }>;
  objectives?: Array<{ id?: string; text: string; state: string }>;
  source?: { kind: string; excerpt?: string; createdAt?: string };
  provenance?: Array<{ operation: string; actorKind?: string; createdAt?: string; sourceCount?: number }>;
};

export type LoomFieldDiff = {
  field: string;
  label: string;
  oldValue: unknown;
  newValue: unknown;
};

export type GuideBlock =
  | { type: "grounded_answer"; text: string; citations: GuideCitation[] }
  | { type: "creative_proposal"; text: string }
  | { type: "grounded_proposal"; text: string; citations: GuideCitation[] }
  | { type: "guidance"; text: string }
  | {
      type: "action_preview";
      actionId: string;
      intentVersion: number;
      action:
        | { name: "open_record"; version: "1.0.0"; href: string; result?: LoomReadSnapshot }
        | { name: "list_records"; version: "1.0.0"; records: LoomReadRecord[] }
        | { name: "show_source"; version: "1.0.0"; result: LoomReadSnapshot }
        | { name: "explain_provenance"; version: "1.0.0"; result: LoomReadSnapshot }
        | { name: "navigate_surface"; version: "1.0.0"; destination: string; href: string }
        | {
            name: "draft_entity";
            version: "1.0.0";
            entityType: "character" | "place" | "faction" | "artifact" | "thread";
            intent: string;
          }
        | {
            name: "propose_record_create" | "propose_record_update";
            version: "1.0.0";
            recordType: string;
            recordName?: string;
            fields: LoomFieldDiff[];
            reviewHref: string;
            draftId?: string;
          }
        | {
            name: "add_relationship" | "remove_relationship";
            version: "1.0.0";
            operation: "add" | "remove";
            kind: string;
            fromName: string;
            toName: string;
            alreadyPresent?: boolean;
          }
        | {
            name: "set_thread_state";
            version: "1.0.0";
            recordName: string;
            fromState: string;
            toState: string;
            resolutionDetails?: string;
            href: string;
          }
        | {
            name: "mutate_thread_objective";
            version: "1.0.0";
            recordName: string;
            operation: string;
            objectiveText: string;
            newText?: string;
            href: string;
          }
        | {
            name: "create_session";
            version: "1.0.0";
            sessionName: string;
            plannedDate?: string;
            objective?: string;
            href?: string;
          }
        | {
            name: "open_session_workflow";
            version: "1.0.0";
            destination: "prep" | "stage" | "review" | "active_workshop";
            sessionName?: string;
            sessionStatus?: string;
            transcriptionState?: string;
            pipelineState?: string;
            href: string;
          }
        | {
            name: "start_prep_task";
            version: "1.0.0";
            taskName: string;
            taskLabel: string;
            sessionName: string;
            reviewState?: string;
            href: string;
          }
        | {
            name: "retry_session_transcription";
            version: "1.0.0";
            sessionName: string;
            transcriptionState?: string;
            href: string;
          }
        | {
            name: "archive_record" | "restore_record" | "prepare_hard_delete";
            version: "1.0.0";
            recordType: string;
            recordId: string;
            recordName: string;
            fromState: string;
            toState: string;
            blockers?: Record<string, number>;
            href: string;
          };
      explanation: string;
      authorityTier: "read_navigation" | "non_canon_generation" | "reversible_working_state" | "canon_mutation" | "archive_restore" | "hard_delete";
      confirmationPolicy: "none" | "explicit";
      costCredits: number;
      effectSummary: string;
      manualFallback: string;
      availabilityState?: string;
      planStep?: number;
      planSize?: number;
      planDependsOn?: number[];
      state?: "pending" | "processing" | "accepted" | "dismissed" | "quota_blocked" | "conflict" | "failed" | "blocked";
    };

export type GuideTurn = {
  id: string;
  question: string;
  status:
    | "queued"
    | "running"
    | "complete"
    | "quota_blocked"
    | "provider_unavailable"
    | "retrieval_fallback"
    | "failed"
    | "dead_letter";
  noAnswer?: boolean;
  insufficiencyReason?: string;
  blocks: GuideBlock[];
};

export type GuideThread = {
  id: string;
  state: "active" | "archived";
  turns: GuideTurn[];
};
