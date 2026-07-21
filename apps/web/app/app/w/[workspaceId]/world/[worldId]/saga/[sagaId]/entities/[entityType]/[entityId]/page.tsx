import { notFound } from "next/navigation";
import { LibraryRecordEditor } from "@/components/LibraryRecordEditor";
import { RelicIcon } from "@/components/RelicIcon";
import { SanctumShell } from "@/components/SanctumShell";
import { isEditableEntityType } from "@/lib/entities";
import { getLibraryRecordDetail, requireSagaContext } from "@/lib/data";
import type { IdParams } from "@/lib/types";

type PageParams = IdParams & { entityType: string; entityId: string };

export default async function EntityDetailPage({ params }: { params: Promise<PageParams> }) {
  const all = await params;
  if (!isEditableEntityType(all.entityType)) notFound();
  const ids: IdParams = all;
  const [{ workspace, world, saga }, detail] = await Promise.all([
    requireSagaContext(ids),
    getLibraryRecordDetail(ids, all.entityType, all.entityId),
  ]);
  if (!detail) notFound();

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="entities">
      {detail.record.canon_state === "archived" && <div className="archived-banner"><RelicIcon name="alert" size={16} />This record is archived. Restore it to edit or add links.</div>}
      <div className="page-head library-detail-head">
        <div><div className="page-eyebrow"><RelicIcon name="library" size={12} /> Library detail</div><h1 className="page-title">{detail.record.name}</h1></div>
      </div>
      <LibraryRecordEditor params={ids} initialDetail={detail} />
    </SanctumShell>
  );
}
