import { RelicIcon } from "@/components/RelicIcon";
import { SanctumShell } from "@/components/SanctumShell";
import { getUsageSummary, requireSagaContext } from "@/lib/data";
import type { IdParams } from "@/lib/types";

export default async function SettingsPage({ params }: { params: Promise<IdParams> }) {
  const ids = await params;
  const { workspace, world, saga } = await requireSagaContext(ids);
  const usage = await getUsageSummary(ids.workspaceId);

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="settings">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><RelicIcon name="settings" size={12} /> Settings</div>
          <div className="page-title">{saga.name}</div>
          <div className="page-sub">Saga, World, and Workspace settings are read-only in this phase.</div>
        </div>
      </div>

      <div className="settings-layout">
        {/* Left nav */}
        <div className="card settings-nav-card">
          <div className="settings-nav-item active">Saga</div>
          <div className="settings-nav-sep" />
          <div className="settings-nav-item">Usage</div>
          <div className="settings-nav-item">Export</div>
          <div className="settings-nav-sep" />
          <div className="settings-nav-item" style={{ color: "var(--rust)", opacity: 0.7 }}>Danger zone</div>
        </div>

        {/* Content */}
        <div>
          <div className="card settings-content-card" style={{ marginBottom: 12 }}>
            <div className="sec-label" style={{ marginBottom: 14 }}>
              <RelicIcon name="sessions" size={11} /> Saga
            </div>
            <div className="setting-row">
              <div className="setting-label-col">
                <div className="setting-label">Name</div>
              </div>
              <div className="kv-v">{saga.name}</div>
            </div>
            <div className="setting-row">
              <div className="setting-label-col">
                <div className="setting-label">Game system</div>
              </div>
              <div className="kv-v">{saga.game_system || <em style={{ color: "var(--stone-500)" }}>Not set</em>}</div>
            </div>
            <div className="setting-row">
              <div className="setting-label-col">
                <div className="setting-label">World</div>
              </div>
              <div className="kv-v">{world.name}</div>
            </div>
            <div className="setting-row">
              <div className="setting-label-col">
                <div className="setting-label">Workspace</div>
              </div>
              <div className="kv-v">{workspace.name}</div>
            </div>
          </div>

          {/* Usage */}
          <div className="card settings-content-card" style={{ marginBottom: 12 }}>
            <div className="sec-label" style={{ marginBottom: 14 }}>
              <RelicIcon name="clock" size={11} /> Usage
            </div>
            {usage ? (
              <div style={{ fontSize: 12, color: "var(--stone-700)", lineHeight: 1.6 }}>
                <pre style={{ fontFamily: "var(--font-mono)", fontSize: 11, whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(usage, null, 2)}
                </pre>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "var(--stone-500)" }}>No usage data yet.</p>
            )}
          </div>

          {/* Export */}
          <div className="card settings-content-card" style={{ marginBottom: 12 }}>
            <div className="sec-label" style={{ marginBottom: 14 }}>
              <RelicIcon name="export" size={11} /> Export
            </div>
            <p style={{ fontSize: 12, color: "var(--stone-500)", lineHeight: 1.5, marginBottom: 12 }}>
              Markdown/JSON export request lifecycle is reserved for the job substrate. No export job is started here.
            </p>
            <button className="btn btn-ghost btn-sm" disabled>Request export · Job phase</button>
          </div>

          {/* Danger zone */}
          <div className="danger-zone">
            <div className="dz-title">Danger zone</div>
            <p style={{ fontSize: 12, color: "var(--stone-700)", marginBottom: 10 }}>
              Destructive saga operations are reserved for a later phase.
            </p>
            <button className="btn btn-rust btn-sm" disabled>Delete saga · Not yet available</button>
          </div>
        </div>
      </div>
    </SanctumShell>
  );
}
