import Link from "next/link";
import { SanctumShell } from "@/components/SanctumShell";
import { getEntityList, requireSagaContext } from "@/lib/data";
import { sagaPath } from "@/lib/routes";
import type { IdParams } from "@/lib/types";

export default async function ThreadsPage({ params }: { params: Promise<IdParams> }) {
  const ids = await params;
  const [{ workspace, world, saga }, threads] = await Promise.all([requireSagaContext(ids), getEntityList(ids, "thread", true)]);
  const root = sagaPath(ids);
  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="threads">
      <section className="topbar">
        <div><div className="eyebrow">Continuity spine</div><h1 className="page-title">Threads</h1></div>
        <Link className="button" href={`${root}/entities/new?type=thread`}>New thread</Link>
      </section>
      <div className="content-grid">
        {["active", "dormant", "resolved", "failed"].map((state) => (
          <section className="card" key={state}>
            <span className="chip">{state}</span>
            {threads.filter((thread) => thread.status !== "archived").map((thread) => (
              <p key={thread.id}><Link href={`${root}/threads/${thread.id}`}>{thread.name}</Link></p>
            ))}
          </section>
        ))}
      </div>
      <section className="card">
        <h2 className="section-title">Read-only Thread Timeline</h2>
        <p className="muted">Derived from thread objectives and canon activity. No timeline editor ships in MVP.</p>
        <pre className="small">{threads.map((thread) => `${thread.name.padEnd(28)} ${thread.scope} canon`).join("\n") || "No threads yet."}</pre>
      </section>
    </SanctumShell>
  );
}
