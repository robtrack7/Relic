import { createSessionAction } from "@/app/actions";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { RelicIcon } from "@/components/RelicIcon";
import { SanctumShell } from "@/components/SanctumShell";
import { getSessions, requireSagaContext } from "@/lib/data";
import type { IdParams } from "@/lib/types";

export default async function NewSessionPage({ params }: { params: Promise<IdParams> }) {
  const ids = await params;
  const [{ workspace, world, saga }, sessions] = await Promise.all([requireSagaContext(ids), getSessions(ids)]);
  const nextNum = sessions.length + 1;

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="sessions">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><RelicIcon name="sessions" size={12} /> Prep inside The Sanctum</div>
          <div className="page-title">New session</div>
          <div className="page-sub">Plan your packet before the session begins.</div>
        </div>
      </div>

      <div style={{ maxWidth: 640 }}>
        <div className="card packet-card">
          <div className="packet-card-head">
            <span className="sec-label"><RelicIcon name="prepare" size={11} /> Session packet</span>
            <span className="chip stone">Session {nextNum}</span>
          </div>
          <form action={createSessionAction} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <HiddenContextFields params={ids} />
            <label className="field">
              <span>Name</span>
              <input className="settings-field" name="name" defaultValue={`Session ${nextNum}`} required />
            </label>
            <div className="detail-tiles">
              <label className="field">
                <span>Objective</span>
                <input className="settings-field" name="objective" placeholder="What should this session accomplish?" />
              </label>
              <label className="field">
                <span>Scheduled date and time</span>
                <input className="settings-field" name="plannedStartAt" type="datetime-local" />
              </label>
            </div>
            <div className="detail-tiles">
              <label className="field">
                <span>Opening scene</span>
                <input className="settings-field" name="openingScene" placeholder="How does the session start?" />
              </label>
            </div>
            <label className="field">
              <span>Scene notes</span>
              <textarea className="settings-field" name="sceneNotes" rows={3} placeholder="Context, beats, contingencies…" style={{ resize: "vertical" }} />
            </label>
            <div>
              <button className="btn btn-ink" type="submit">
                <RelicIcon name="sessions" size={13} /> Create prep workspace
              </button>
            </div>
          </form>
        </div>
      </div>
    </SanctumShell>
  );
}
