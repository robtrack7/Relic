import { ImportInbox } from "@/components/ImportInbox";
import { SanctumShell } from "@/components/SanctumShell";
import { getImportInbox, requireSagaContext } from "@/lib/data";
import type { IdParams } from "@/lib/types";

export default async function ImportInboxPage({ params }: { params: Promise<IdParams> }) {
  const ids = await params;
  const [{ user, workspace, world, saga }, imports] = await Promise.all([requireSagaContext(ids), getImportInbox(ids)]);
  return <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="imports">
    <div className="page-head"><div><p className="eyebrow">Trusted intake boundary</p><h1 className="page-title">Import Inbox</h1><p className="page-sub">Review raw, untrusted source material before any later GM-directed use.</p></div></div>
    <ImportInbox ownerId={user.id} params={ids} initialImports={imports} />
  </SanctumShell>;
}
