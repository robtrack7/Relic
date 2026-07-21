import { notFound } from "next/navigation";
import { SessionPrepEditor } from "@/components/SessionPrepEditor";
import { SanctumShell } from "@/components/SanctumShell";
import { getSession, getSessionPrep, requireSagaContext } from "@/lib/data";
import type { IdParams } from "@/lib/types";

type SessionParams = IdParams & { sessionId: string };

export default async function PrepPage({ params }: { params: Promise<SessionParams> }) {
  const all = await params;
  const ids: IdParams = all;
  const [{ workspace, world, saga }, session, prep] = await Promise.all([
    requireSagaContext(ids),
    getSession(ids, all.sessionId),
    getSessionPrep(ids, all.sessionId)
  ]);
  if (!session) notFound();

  return (
    <SanctumShell
      params={ids}
      workspace={workspace}
      world={world}
      saga={saga}
      active="prepare"
      currentSession={{ id: session.id, name: session.name, status: session.status }}
      loomMode="prep"
    >
      <SessionPrepEditor key={prep.session.updated_at} params={ids} initialPrep={prep} surface="full" />
    </SanctumShell>
  );
}
