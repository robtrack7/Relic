import { requestSagaExportAction } from "@/app/actions";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { RelicIcon } from "@/components/RelicIcon";
import { SanctumShell } from "@/components/SanctumShell";
import { getExportDownload, getExportStatus, requireSagaContext } from "@/lib/data";
import type { IdParams } from "@/lib/types";

function text(value: unknown, fallback = "Not available") {
  return typeof value === "string" && value ? value : fallback;
}

export default async function ExportPage({
  params,
  searchParams
}: {
  params: Promise<IdParams>;
  searchParams: Promise<{ exportId?: string; error?: string }>;
}) {
  const ids = await params;
  const query = await searchParams;
  const [{ workspace, world, saga }, status, download] = await Promise.all([
    requireSagaContext(ids),
    getExportStatus(ids, query.exportId),
    getExportDownload(ids, query.exportId)
  ]);
  const state = text(status?.state, query.exportId ? "missing" : "idle");
  const hasFailureReason = Boolean(status?.failure_reason);
  const downloadAvailable = Boolean(download?.available);
  const failureReason = String(status?.failure_reason ?? "");
  const downloadUrl = String(download?.download_url ?? "");
  const archiveBytes = Number(status?.archive_bytes ?? 0);
  const archiveSha256 = String(status?.archive_sha256 ?? "");
  const expiresAt = String(status?.expires_at ?? "");

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="export">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><RelicIcon name="export" size={12} /> Data ownership</div>
          <div className="page-title">Export {saga.name}</div>
          <div className="page-sub">Request a Markdown and JSON archive of this Saga. Export jobs are scoped to the active Workspace, World, and Saga.</div>
        </div>
      </div>

      <div className="settings-layout">
        <div className="card settings-nav-card">
          <div className="settings-nav-item active">Request</div>
          <div className="settings-nav-item">Status</div>
          <div className="settings-nav-sep" />
          <div className="settings-nav-item">Markdown</div>
          <div className="settings-nav-item">JSON</div>
        </div>

        <div>
          {query.error && (
            <div className="danger-zone" style={{ marginBottom: 12 }}>
              <div className="dz-title">Export blocked</div>
              <p style={{ fontSize: 12, color: "var(--stone-700)", margin: 0 }}>
                {query.error}
              </p>
            </div>
          )}

          <div className="card settings-content-card" style={{ marginBottom: 12 }}>
            <div className="sec-label" style={{ marginBottom: 14 }}>
              <RelicIcon name="export" size={11} /> Request export
            </div>
            <form action={requestSagaExportAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <HiddenContextFields params={ids} />
              <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <input type="checkbox" name="format" value="markdown" defaultChecked />
                <span>Markdown notes and readable canon</span>
              </label>
              <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <input type="checkbox" name="format" value="json" defaultChecked />
                <span>JSON data archive</span>
              </label>
              <label className="field" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <input type="checkbox" name="includeAudit" value="true" />
                <span>Include audit/provenance metadata</span>
              </label>
              <div>
                <button className="btn btn-ink" type="submit">
                  <RelicIcon name="export" size={13} /> Request export
                </button>
              </div>
            </form>
          </div>

          <div className="card settings-content-card">
            <div className="sec-label" style={{ marginBottom: 14 }}>
              <RelicIcon name="clock" size={11} /> Export status
            </div>
            {!query.exportId ? (
              <p style={{ fontSize: 12, color: "var(--stone-500)", lineHeight: 1.5 }}>
                No export selected. Request an export to start a backend job.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="setting-row">
                  <div className="setting-label-col"><div className="setting-label">Export ID</div></div>
                  <div className="kv-v">{query.exportId}</div>
                </div>
                <div className="setting-row">
                  <div className="setting-label-col"><div className="setting-label">State</div></div>
                  <div className="kv-v"><span className={state === "complete" ? "chip verdigris" : state === "failed" ? "chip rust" : "chip amber"}>{state}</span></div>
                </div>
                {hasFailureReason && (
                  <div className="danger-zone">
                    <div className="dz-title">Export failed</div>
                    <p style={{ fontSize: 12, color: "var(--stone-700)", margin: 0 }}>
                      {failureReason}
                    </p>
                  </div>
                )}
                {downloadAvailable && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ fontSize: 12, color: "var(--stone-500)", margin: 0 }}>
                      {archiveBytes > 0 ? `${Math.max(1, Math.round(archiveBytes / 1024))} KB` : "Archive ready"}
                      {archiveSha256 ? ` · SHA-256 ${archiveSha256.slice(0, 12)}…` : ""}
                      {expiresAt ? ` · Expires ${new Date(expiresAt).toLocaleString()}` : ""}
                    </p>
                    <a className="btn btn-secondary btn-sm" href={downloadUrl}>
                      Download private export <RelicIcon name="arrowRight" size={12} />
                    </a>
                  </div>
                )}
                {!downloadAvailable && state !== "failed" && (
                  <p style={{ fontSize: 12, color: "var(--stone-500)", margin: 0 }}>
                    The archive is not ready yet. Refresh this page after the export worker finishes.
                  </p>
                )}
                {!downloadAvailable && state !== "failed" && <a className="btn btn-ghost btn-sm" href={`?exportId=${query.exportId}`}>Refresh status</a>}
              </div>
            )}
          </div>
        </div>
      </div>
    </SanctumShell>
  );
}
