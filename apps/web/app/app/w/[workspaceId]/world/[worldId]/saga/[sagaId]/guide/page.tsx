import Link from "next/link";
import { RelicIcon } from "@/components/RelicIcon";
import { SanctumShell } from "@/components/SanctumShell";
import { requireSagaContext, searchForUi } from "@/lib/data";
import { sagaPath } from "@/lib/routes";
import type { IdParams } from "@/lib/types";

export default async function GuidePage({
  params,
  searchParams
}: {
  params: Promise<IdParams>;
  searchParams: Promise<{ q?: string }>;
}) {
  const ids = await params;
  const query = await searchParams;
  const [{ workspace, world, saga }, results] = await Promise.all([
    requireSagaContext(ids),
    searchForUi(ids, query.q ?? "", false)
  ]);
  const root = sagaPath(ids);

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="search">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><RelicIcon name="spark" size={12} /> Relic Guide</div>
          <div className="page-title">Ask current canon</div>
          <div className="page-sub">Guide answers are grounded in scoped Saga and World canon. Canon changes still require GM action or Approval Queue review.</div>
        </div>
      </div>

      <div className="search-palette" style={{ marginBottom: 18 }}>
        <form>
          <div className="sp-input-row">
            <RelicIcon name="spark" size={16} />
            <input
              className="sp-input"
              name="q"
              defaultValue={query.q ?? ""}
              placeholder="Ask about current canon…"
              autoFocus
            />
            {query.q && (
              <Link href={`${root}/guide`} className="stage-text-btn" style={{ fontSize: 11 }}>
                Clear
              </Link>
            )}
          </div>
          <div className="sp-footer">
            <span><span className="sp-kbd">Enter</span> ask</span>
            <span>Scope: {world.name} / {saga.name}</span>
          </div>
        </form>

        {!query.q && (
          <div style={{ padding: "22px 16px", color: "var(--stone-500)", fontSize: 13, lineHeight: 1.6 }}>
            Try “Which threads are loose?”, “Who knows about the deed?”, or “What should I remember before prep?”.
          </div>
        )}

        {query.q && results.length > 0 && (
          <div className="card" style={{ marginTop: 14, padding: "16px 18px" }}>
            <div className="sec-label" style={{ marginBottom: 10 }}>
              <RelicIcon name="file" size={11} /> Canon-grounded answer
            </div>
            <p style={{ fontSize: 13, color: "var(--stone-700)", lineHeight: 1.6, marginTop: 0 }}>
              I found {results.length} scoped canon {results.length === 1 ? "source" : "sources"} related to “{query.q}”. Review the citations below before using this at the table.
            </p>
            <div className="sp-group-label">Citations</div>
            {results.slice(0, 8).map((result, index) => {
              const href = result.source_entity_type
                ? `${root}/entities/${result.source_entity_type}/${result.source_entity_id}`
                : `${root}/search?q=${encodeURIComponent(query.q ?? "")}`;
              return (
                <Link
                  key={`${result.source_kind}:${result.source_entity_id}:${index}`}
                  href={href}
                  className="sp-row"
                  style={{ textDecoration: "none" }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sp-title">{result.snippet}</div>
                    <div className="sp-meta">{result.source_entity_type ?? result.source_kind}</div>
                  </div>
                  <span className="chip verdigris">canon</span>
                </Link>
              );
            })}
          </div>
        )}

        {query.q && !results.length && (
          <div style={{ padding: "22px 16px", textAlign: "center", color: "var(--stone-500)", fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 14 }}>
            Relic Guide does not have enough current canon to answer that. Try Search or create a manual note.
          </div>
        )}
      </div>
    </SanctumShell>
  );
}
