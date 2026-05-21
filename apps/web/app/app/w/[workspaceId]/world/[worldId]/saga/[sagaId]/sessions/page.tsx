import Link from "next/link";
import { createSessionAction } from "@/app/actions";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { SanctumShell } from "@/components/SanctumShell";
import { getSessions, requireSagaContext } from "@/lib/data";
import { sagaPath } from "@/lib/routes";
import type { IdParams } from "@/lib/types";

export default async function SessionsPage({ params }: { params: Promise<IdParams> }) {
  const ids = await params;
  const [{ workspace, world, saga }, sessions] = await Promise.all([requireSagaContext(ids), getSessions(ids)]);
  const root = sagaPath(ids);

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="sessions">
      <section className="topbar">
        <div><div className="eyebrow">Session prep</div><h1 className="page-title">Sessions</h1></div>
        <Link className="button" href={`${root}/sessions/new`}>New session</Link>
      </section>
      <div className="entity-list">
        {sessions.length ? sessions.map((session) => (
          <article className="entity-row" key={session.id}>
            <span>
              <span className="chip amber">{session.status}</span>
              <strong style={{ display: "block", marginTop: 6 }}>{session.name}</strong>
              <span className="small muted">{session.objective || session.opening_scene || "No prep details yet."}</span>
            </span>
            <span className="button-row">
              <Link className="button-ghost" href={`${root}/sessions/${session.id}/prep`}>Open prep</Link>
              {session.status !== "planned" ? <Link className="button-ghost" href={`${root}/sessions/${session.id}/stage`}>Stage</Link> : null}
            </span>
          </article>
        )) : <div className="card">No sessions yet. Plan the next session from what matters now.</div>}
      </div>
      <section className="card">
        <h2 className="section-title">Quick create</h2>
        <form className="form-stack" action={createSessionAction}>
          <HiddenContextFields params={ids} />
          <label className="field"><span>Name</span><input className="input" name="name" defaultValue={`Session ${sessions.length + 1}`} /></label>
          <label className="field"><span>Objective</span><input className="input" name="objective" /></label>
          <button className="button" type="submit">Create planned session</button>
        </form>
      </section>
    </SanctumShell>
  );
}
