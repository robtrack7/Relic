import { notFound } from "next/navigation";
import { addThreadObjectiveAction } from "@/app/actions";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { RelicIcon } from "@/components/RelicIcon";
import { SanctumShell } from "@/components/SanctumShell";
import { getEntity, requireSagaContext } from "@/lib/data";
import { sagaPath } from "@/lib/routes";
import type { IdParams } from "@/lib/types";

type ThreadParams = IdParams & { threadId: string };

export default async function ThreadDetailPage({ params }: { params: Promise<ThreadParams> }) {
  const all = await params;
  const ids: IdParams = all;
  const [{ workspace, world, saga }, thread] = await Promise.all([
    requireSagaContext(ids),
    getEntity(ids, "thread", all.threadId),
  ]);
  if (!thread) notFound();
  const root = sagaPath(ids);

  const objectives = Array.isArray(
    (thread as unknown as { objectives_log?: unknown }).objectives_log
  )
    ? (thread as unknown as { objectives_log: unknown[] }).objectives_log
    : [];

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="threads">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">
            <RelicIcon name="threads" size={12} /> Thread
          </div>
          <div className="page-title">{thread.name}</div>
          {thread.summary && <div className="page-sub">{thread.summary}</div>}
        </div>
        <div className="page-actions">
          <span className="chip amber">{thread.status || "thread"}</span>
        </div>
      </div>

      <div className="threads-layout">
        {/* Left — objectives */}
        <div className="card td-card">
          <div className="td-eyebrow">
            <RelicIcon name="target" size={11} /> Objectives
          </div>
          <div className="td-section-label">Progress log</div>

          {objectives.length ? objectives.map((objective, index) => (
            <div key={index} className="obj-row">
              <span className="obj-num">{index + 1}</span>
              <span className="obj-text">{JSON.stringify(objective)}</span>
            </div>
          )) : (
            <div className="empty-state" style={{ padding: "20px 0" }}>
              <div className="empty-desc">No objectives yet.</div>
            </div>
          )}

          <div className="td-sep" />
          <form action={addThreadObjectiveAction} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <HiddenContextFields params={ids} />
            <input type="hidden" name="threadId" value={all.threadId} />
            <input type="hidden" name="objectivesLog" value={JSON.stringify(objectives)} />
            <label className="field">
              <span>Add objective</span>
              <input className="settings-field" name="objective" required placeholder="What needs to happen?" />
            </label>
            <button className="btn btn-secondary" type="submit">Add objective</button>
          </form>
        </div>

        {/* Right — detail */}
        <div className="card td-card">
          <div className="td-eyebrow">
            <RelicIcon name="threads" size={11} /> {thread.name}
          </div>
          {thread.summary && <div className="td-summary">{thread.summary}</div>}

          <div className="td-actions">
            <button className="btn btn-ghost btn-sm" disabled title="Propose a complication — AI phase">
              <RelicIcon name="spark" size={12} /> Propose complication · AI phase
            </button>
          </div>

          {thread.narrative && (
            <>
              <div className="td-sep" />
              <div className="td-section-label">Narrative</div>
              <p style={{ fontSize: 13, color: "var(--stone-700)", lineHeight: 1.6 }}>{thread.narrative}</p>
            </>
          )}

          <div className="td-sep" />
          <div className="td-section-label">Scope</div>
          <div className="ent-link">
            <span className="ent-rule" style={{ background: "var(--hue-thread)" }} />
            <span className="ent-link-name">{thread.scope === "world" ? "World canon" : "Saga canon"}</span>
            <span className="ent-link-type">{thread.scope}</span>
          </div>

          <div style={{ marginTop: 14 }}>
            <a className="btn btn-ghost btn-sm" href={`${root}/entities/thread/${thread.id}`} style={{ display: "inline-flex" }}>
              Edit in Library <RelicIcon name="arrowRight" size={12} />
            </a>
          </div>
        </div>
      </div>
    </SanctumShell>
  );
}
