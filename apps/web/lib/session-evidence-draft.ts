import type { IdParams } from "@/lib/types";

export type SessionEvidenceKind = "pasted_text" | "gm_manual_summary";
export type SessionEvidenceScope = IdParams & { sessionId: string };
export type SessionEvidenceDraft = { sourceId: string; text: string; updatedAt: string };

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `source-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function sessionEvidenceDraftKey(ownerId: string, scope: SessionEvidenceScope, kind: SessionEvidenceKind) {
  return ["relic-session-evidence", ownerId, scope.workspaceId, scope.worldId, scope.sagaId, scope.sessionId, kind].join(":");
}

export function readSessionEvidenceDraft(ownerId: string, scope: SessionEvidenceScope, kind: SessionEvidenceKind) {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(sessionEvidenceDraftKey(ownerId, scope, kind));
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<SessionEvidenceDraft>;
    if (typeof parsed.sourceId !== "string" || typeof parsed.text !== "string" || typeof parsed.updatedAt !== "string") return null;
    return parsed as SessionEvidenceDraft;
  } catch {
    return null;
  }
}

export function writeSessionEvidenceDraft(ownerId: string, scope: SessionEvidenceScope, kind: SessionEvidenceKind, text: string, sourceId?: string) {
  const existing = readSessionEvidenceDraft(ownerId, scope, kind);
  const draft: SessionEvidenceDraft = {
    sourceId: sourceId || existing?.sourceId || newId(),
    text,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(sessionEvidenceDraftKey(ownerId, scope, kind), JSON.stringify(draft));
    } catch {
      // The form still retains its React state when local storage is unavailable or full.
    }
  }
  return draft;
}

export function clearSessionEvidenceDraft(ownerId: string, scope: SessionEvidenceScope, kind: SessionEvidenceKind) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(sessionEvidenceDraftKey(ownerId, scope, kind));
  } catch {
    // A confirmed server save remains authoritative even if local cleanup is unavailable.
  }
}
