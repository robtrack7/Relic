import { RelicGuideWorkspace } from "@/components/RelicGuideWorkspace";
import { RelicIcon } from "@/components/RelicIcon";
import { SanctumShell } from "@/components/SanctumShell";
import { getGuideThread, requireSagaContext } from "@/lib/data";
import { sagaPath } from "@/lib/routes";
import type { IdParams } from "@/lib/types";

export default async function GuidePage({
  params,
  searchParams
}: {
  params: Promise<IdParams>;
  searchParams: Promise<{ q?: string; thread?: string }>;
}) {
  const ids = await params;
  const query = await searchParams;
  const [{ workspace, world, saga }, thread] = await Promise.all([
    requireSagaContext(ids),
    getGuideThread(ids, query.thread ?? null)
  ]);
  const root = sagaPath(ids);

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="guide">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><RelicIcon name="spark" size={12} /> The Loom</div>
          <div className="page-title">Your Saga’s conversational operating layer</div>
          <div className="page-sub">
            Ask about current canon, explore clearly labeled proposals, or review a suggested action before Relic does anything.
          </div>
        </div>
      </div>

      <RelicGuideWorkspace
        params={ids}
        sagaRoot={root}
        initialThread={thread}
        initialQuestion={query.q}
      />
    </SanctumShell>
  );
}
