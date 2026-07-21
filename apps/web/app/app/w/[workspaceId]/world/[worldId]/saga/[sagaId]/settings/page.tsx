import { RelicIcon } from "@/components/RelicIcon";
import { SanctumShell } from "@/components/SanctumShell";
import { getUsageSummary, requireSagaContext } from "@/lib/data";
import { sagaPath } from "@/lib/routes";
import type { IdParams } from "@/lib/types";

type UsageMeter = {
  limit_key?: string;
  used?: number | string;
  limit?: number | string;
  remaining?: number | string;
  severity?: string;
  reset_at?: string;
};

function usageMeters(usage: unknown): UsageMeter[] {
  if (!usage || typeof usage !== "object") return [];
  const meters = (usage as { meters?: unknown }).meters;
  return Array.isArray(meters) ? (meters as UsageMeter[]) : [];
}

function usageReset(usage: unknown) {
  if (!usage || typeof usage !== "object") return null;
  const reset = (usage as { reset_at?: unknown }).reset_at;
  return typeof reset === "string" ? reset : null;
}

function usageLabel(key?: string) {
  const labels: Record<string, string> = {
    ai_credits_monthly: "AI credits",
    transcription_seconds_monthly: "Transcription minutes",
    storage_bytes: "Storage",
    imports_monthly: "Imports",
    exports_monthly: "Exports"
  };
  return labels[key ?? ""] ?? key ?? "Usage";
}

function meterValue(key: string | undefined, value: number) {
  if (key === "transcription_seconds_monthly") return `${Math.round(value / 60)}m`;
  if (key === "storage_bytes") return `${Math.round(value / 1024 / 1024)} MB`;
  return String(Math.round(value));
}

function meterPercent(meter: UsageMeter) {
  const used = Number(meter.used ?? 0);
  const limit = Number(meter.limit ?? 0);
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((used / limit) * 100)));
}

export default async function SettingsPage({
  params,
  searchParams
}: {
  params: Promise<IdParams>;
  searchParams: Promise<{ lifecycleNotice?: string; lifecycleError?: string }>;
}) {
  const ids = await params;
  const query = await searchParams;
  const { workspace, world, saga } = await requireSagaContext(ids);
  const usage = await getUsageSummary(ids.workspaceId);
  const root = sagaPath(ids);
  const meters = usageMeters(usage);
  const resetAt = usageReset(usage);

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="settings">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><RelicIcon name="settings" size={12} /> Settings</div>
          <div className="page-title">{saga.name}</div>
          <div className="page-sub">Manage this Saga. Workspace and World settings remain lightweight in MVP.</div>
        </div>
      </div>

      {query.lifecycleNotice === "renamed" ? <p className="notice">Saga renamed.</p> : null}
      {query.lifecycleError ? <p className="danger-note">{query.lifecycleError}</p> : null}

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
            <form className="setting-row" action={renameSagaAction}>
              <HiddenContextFields params={ids} />
              <div className="setting-label-col">
                <div className="setting-label">Name</div>
                <div className="setting-desc">Used throughout the Sanctum, Stage, and exports.</div>
              </div>
              <div className="settings-inline-action">
                <label className="sr-only" htmlFor="saga-name">Saga name</label>
                <input id="saga-name" className="settings-field" name="sagaName" defaultValue={saga.name} required maxLength={120} />
                <button className="btn btn-secondary btn-sm" type="submit">Rename saga</button>
              </div>
            </form>
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
            {meters.length ? (
              <div>
                {meters.map((meter) => {
                  const used = Number(meter.used ?? 0);
                  const limit = Number(meter.limit ?? 0);
                  const percent = meterPercent(meter);
                  const warnClass = meter.severity === "blocked" ? "crit" : meter.severity === "warn_90" || meter.severity === "warn_70" ? "warn" : "";
                  return (
                    <div key={meter.limit_key} className="usage-bar-row">
                      <div className="usage-bar-label">{usageLabel(meter.limit_key)}</div>
                      <div className="usage-bar" aria-label={`${usageLabel(meter.limit_key)} usage`}>
                        <div className={`usage-bar-fill ${warnClass}`} style={{ width: `${percent}%` }} />
                      </div>
                      <div className="usage-bar-val">
                        {meterValue(meter.limit_key, used)} / {meterValue(meter.limit_key, limit)}
                      </div>
                    </div>
                  );
                })}
                {resetAt && (
                  <p style={{ fontSize: 11, color: "var(--stone-500)", marginTop: 12 }}>
                    Resets {new Date(resetAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}.
                  </p>
                )}
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
              Markdown/JSON export requests are handled by the export job substrate.
            </p>
            <a className="btn btn-ghost btn-sm" href={`${root}/export`}>Open export</a>
          </div>

          {/* Danger zone */}
          <div className="danger-zone">
            <div className="dz-title">Danger zone</div>
            <p style={{ fontSize: 12, color: "var(--stone-700)", marginBottom: 10 }}>
              Deletion hides this Saga immediately, then permanently removes its database and Storage data. It is blocked while a Session is live or ending.
            </p>
            <form className="settings-delete-form" action={deleteSagaAction}>
              <HiddenContextFields params={ids} />
              <label className="field" htmlFor="confirmation-name">
                <span>Type <strong>{saga.name}</strong> to confirm</span>
                <input id="confirmation-name" className="settings-field" name="confirmationName" required autoComplete="off" />
              </label>
              <button className="btn btn-rust btn-sm" type="submit">Delete saga permanently</button>
            </form>
          </div>
        </div>
      </div>
    </SanctumShell>
  );
}
import { deleteSagaAction, renameSagaAction } from "@/app/actions";
import { HiddenContextFields } from "@/components/HiddenContextFields";
