import type { IdParams } from "@/lib/types";

export function HiddenContextFields({ params }: { params: IdParams }) {
  return (
    <>
      <input type="hidden" name="workspaceId" value={params.workspaceId} />
      <input type="hidden" name="worldId" value={params.worldId} />
      <input type="hidden" name="sagaId" value={params.sagaId} />
    </>
  );
}
