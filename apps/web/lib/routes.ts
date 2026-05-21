import type { IdParams } from "@/lib/types";

export function sagaPath({ workspaceId, worldId, sagaId }: IdParams) {
  return `/app/w/${workspaceId}/world/${worldId}/saga/${sagaId}`;
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
