import { notFound } from "next/navigation";
import { addThreadObjectiveAction } from "@/app/actions";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { SanctumShell } from "@/components/SanctumShell";
import { getEntity, requireSagaContext } from "@/lib/data";
import type { IdParams } from "@/lib/types";

type ThreadParams = IdParams & { threadId: string };

export default async function ThreadDetailPage({ params }: { params: Promise<ThreadParams> }) {
  const all = await params;
  const ids: IdParams = all;
  const [{ workspace, world, saga }, thread] = await Promise.all([requireSagaContext(ids), getEntity(ids, "thread", all.threadId)]);
  if (!thread) notFound();
  const objectives = Array.isArray((thread as unknown as { objectives_log?: unknown }).objectives_log) ? (thread as unknown as { objectives_log: unknown[] }).objectives_log : [];

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="threads">
      <section>
        <div className="eyebrow">Thread detail</div>
        <h1 className="page-title">{thread.name}</h1>
        <p className="muted">{thread.summary}</p>
      </section>
      <div className="split">
        <section className="card">
          <h2 className="section-title">Objectives</h2>
          {objectives.length ? objectives.map((objective, index) => <p key={index}>{JSON.stringify(objective)}</p>) : <p className="muted">No objectives yet.</p>}
          <form className="form-stack" action={addThreadObjectiveAction}>
            <HiddenContextFields params={ids} />
            <input type="hidden" name="threadId" value={all.threadId} />
            <input type="hidden" name="objectivesLog" value={JSON.stringify(objectives)} />
            <label className="field"><span>Add objective</span><input className="input" name="objective" required /></label>
            <button className="button" type="submit">Add objective</button>
          </form>
        </section>
        <aside className="card">
          <h2 className="section-title">AI assist</h2>
          <p className="muted">Propose a complication is intentionally disabled until the AI runtime phase.</p>
          <button className="button-ghost" disabled>Propose a complication</button>
        </aside>
      </div>
    </SanctumShell>
  );
}
