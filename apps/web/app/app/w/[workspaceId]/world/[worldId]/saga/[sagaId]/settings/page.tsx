import { SanctumShell } from "@/components/SanctumShell";
import { getUsageSummary, requireSagaContext } from "@/lib/data";
import type { IdParams } from "@/lib/types";

export default async function SettingsPage({ params }: { params: Promise<IdParams> }) {
  const ids = await params;
  const { workspace, world, saga } = await requireSagaContext(ids);
  const usage = await getUsageSummary(ids.workspaceId);
  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="settings">
      <section>
        <div className="eyebrow">Settings</div>
        <h1 className="page-title">{saga.name}</h1>
        <p className="muted">Saga, World, Workspace, and usage surfaces are intentionally lightweight in this phase.</p>
      </section>
      <div className="content-grid">
        <article className="card">
          <h2 className="section-title">Saga</h2>
          <p><strong>Game system:</strong> {saga.game_system || "Not set"}</p>
          <p><strong>Audio retention:</strong> {saga.audio_retention}</p>
          <p><strong>Transcript retention:</strong> {saga.transcript_retention}</p>
        </article>
        <article className="card">
          <h2 className="section-title">Usage</h2>
          <pre className="small">{JSON.stringify(usage, null, 2)}</pre>
        </article>
        <article className="card">
          <h2 className="section-title">Export</h2>
          <p className="muted">Markdown/JSON export request lifecycle is reserved for the job substrate. No export job is started here.</p>
          <button className="button-ghost" disabled>Request export</button>
        </article>
      </div>
    </SanctumShell>
  );
}
