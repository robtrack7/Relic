import Link from "next/link";
import { createSessionAction } from "@/app/actions";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { RelicIcon } from "@/components/RelicIcon";
import { SanctumShell } from "@/components/SanctumShell";
import { getSessions, requireSagaContext } from "@/lib/data";
import { sagaPath } from "@/lib/routes";
import type { IdParams } from "@/lib/types";

function statusClass(status: string) {
  if (status === "ended" || status === "ended_pending_undo") return "ss-reviewed";
  if (status === "started" || status === "in_progress") return "ss-active";
  if (status === "ready") return "ss-active";
  return "ss-prep";
}

export default async function SessionsPage({ params }: { params: Promise<IdParams> }) {
  const ids = await params;
  const [{ workspace, world, saga }, sessions] = await Promise.all([requireSagaContext(ids), getSessions(ids)]);
  const root = sagaPath(ids);

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="sessions">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><RelicIcon name="sessions" size={12} /> Session prep</div>
          <div className="page-title">Sessions</div>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ink" href={`${root}/sessions/new`}>
            <RelicIcon name="plus" size={13} /> New session
          </Link>
        </div>
      </div>

      <div className="sess-list">
        {sessions.length ? sessions.map((session, index) => (
          <div className="sess-row" key={session.id}>
            <div className="sess-num">S{String(session.session_number ?? index + 1).padStart(2, "0")}</div>
            <div>
              <div className="sess-name">{session.name}</div>
              <div className="sess-meta">
                {session.planned_date ? `Planned ${session.planned_date} · ` : ""}
                {session.objective || session.opening_scene || "No prep details yet."}
              </div>
            </div>
            <div className={`sess-status ${statusClass(session.status)}`}>
              <span className={`dot${session.status === "started" || session.status === "in_progress" ? " live" : session.status === "ended" ? " active" : " amber"}`} />
              {session.status}
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <Link className="btn btn-ghost btn-sm" href={`${root}/sessions/${session.id}/prep`}>Prepare</Link>
              {session.status !== "planned" && (
                <Link className="btn btn-secondary btn-sm" href={`${root}/sessions/${session.id}/stage`}>Stage</Link>
              )}
            </div>
          </div>
        )) : (
          <div className="empty-state">
            <div className="empty-ornament" style={{ fontSize: 40, fontFamily: "var(--font-display)" }}>✦</div>
            <div className="empty-title">No sessions yet</div>
            <div className="empty-desc">Plan your first session to start the prep loop.</div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 18, padding: "18px 20px" }}>
        <div className="sec-label" style={{ marginBottom: 14 }}>
          <RelicIcon name="plus" size={11} /> Quick create
        </div>
        <form action={createSessionAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <HiddenContextFields params={ids} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 160px", gap: 10 }}>
            <label className="field">
              <span>Name</span>
              <input className="settings-field" name="name" defaultValue={`Session ${sessions.length + 1}`} />
            </label>
            <label className="field">
              <span>Objective</span>
              <input className="settings-field" name="objective" placeholder="What should this session accomplish?" />
            </label>
            <label className="field">
              <span>Planned date</span>
              <input className="settings-field" name="plannedDate" type="date" />
            </label>
          </div>
          <div>
            <button className="btn btn-secondary" type="submit">Create planned session</button>
          </div>
        </form>
      </div>
    </SanctumShell>
  );
}
