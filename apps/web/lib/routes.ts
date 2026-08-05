import type { IdParams } from "@/lib/types";

export function sagaPath({ workspaceId, worldId, sagaId }: IdParams) {
  return `/app/w/${workspaceId}/world/${worldId}/saga/${sagaId}`;
}

export function recordPath(
  sagaRoot: string,
  recordType: string,
  recordId: string,
  status?: string | null
) {
  if (recordType === "thread") return `${sagaRoot}/threads/${recordId}`;
  if (recordType === "session") {
    if (status === "ended") return `${sagaRoot}/sessions/${recordId}/review`;
    if (["started", "in_progress", "ended_pending_undo"].includes(status ?? "")) {
      return `${sagaRoot}/sessions/${recordId}/stage`;
    }
    return `${sagaRoot}/sessions/${recordId}/prep`;
  }
  return `${sagaRoot}/entities/${recordType}/${recordId}`;
}

export function validateHierarchyParams(expected: IdParams, actual: IdParams) {
  return (
    expected.workspaceId === actual.workspaceId &&
    expected.worldId === actual.worldId &&
    expected.sagaId === actual.sagaId
  );
}

export function requireHierarchyMatch(expected: IdParams, actual: IdParams) {
  if (!validateHierarchyParams(expected, actual)) {
    throw new Error("Workspace, World, and Saga route IDs must match the loaded context.");
  }
}
