import Link from "next/link";
import { RelicIcon } from "@/components/RelicIcon";
import { SanctumShell } from "@/components/SanctumShell";
import { requireSagaContext, searchForUi } from "@/lib/data";
import { sagaPath } from "@/lib/routes";
import type { IdParams } from "@/lib/types";

function entityRowClass(type: string | null): string {
  const map: Record<string, string> = {
    character: "npc",
    place: "loc",
    thread: "thread",
  };
  return map[type ?? ""] ?? "";
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<IdParams>;
  searchParams: Promise<{ q?: string; mode?: string }>;
}) {
  const ids = await params;
  const query = await searchParams;
  const [{ workspace, world, saga }, results] = await Promise.all([
    requireSagaContext(ids),
    searchForUi(ids, query.q ?? "", query.mode !== "hybrid"),
  ]);
  const root = sagaPath(ids);

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="search">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><RelicIcon name="search" size={12} /> Saga + World canon</div>
          <div className="page-title">Search</div>
        </div>
      </div>

      <div className="search-palette" style={{ marginBottom: 18 }}>
        <form>
          <div className="sp-input-row">
            <RelicIcon name="search" size={16} />
            <input
              className="sp-input"
              name="q"
              defaultValue={query.q ?? ""}
              placeholder="Search saga canon…"
              autoFocus
            />
            {query.q && (
              <Link href={`${root}/search`} className="stage-text-btn" style={{ fontSize: 11 }}>
                Clear
              </Link>
            )}
          </div>
          <div className="sp-footer">
            <span><span className="sp-kbd">Enter</span> search</span>
            <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
              <input type="checkbox" name="mode" value="hybrid" defaultChecked={query.mode === "hybrid"} />
              <span>Hybrid (semantic)</span>
            </label>
          </div>
        </form>

        {results.length > 0 && (
          <>
            <div className="sp-group-label">Results</div>
            {results.map((result) => {
              const href = result.source_entity_type
                ? `${root}/entities/${result.source_entity_type}/${result.source_entity_id}`
                : `${root}/search?q=${encodeURIComponent(query.q ?? "")}`;
              return (
                <Link
                  key={`${result.source_kind}:${result.source_entity_id}`}
                  href={href}
                  className={`sp-row ${entityRowClass(result.source_entity_type)}`}
                  style={{ textDecoration: "none" }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="sp-title">{result.snippet}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 3 }}>
                      <span className="sp-meta">{result.source_entity_type ?? result.source_kind}</span>
                      {result.is_stub && <span className="chip stone" style={{ fontSize: 7 }}>stub</span>}
                    </div>
                  </div>
                  <span className={result.canon_state === "archived" ? "chip rust" : "chip verdigris"} style={{ fontSize: 7 }}>
                    {result.canon_state}
                  </span>
                </Link>
              );
            })}
          </>
        )}

        {query.q && !results.length && (
          <div style={{ padding: "20px 16px", textAlign: "center", color: "var(--stone-500)", fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 14 }}>
            No canon matches for &ldquo;{query.q}&rdquo;. Create a quick stub from Stage or add manually.
          </div>
        )}
      </div>
    </SanctumShell>
  );
}
