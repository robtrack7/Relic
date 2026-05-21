import Link from "next/link";
import { SanctumShell } from "@/components/SanctumShell";
import { requireSagaContext, searchForUi } from "@/lib/data";
import { sagaPath } from "@/lib/routes";
import type { IdParams } from "@/lib/types";

export default async function SearchPage({ params, searchParams }: { params: Promise<IdParams>; searchParams: Promise<{ q?: string; mode?: string }> }) {
  const ids = await params;
  const query = await searchParams;
  const [{ workspace, world, saga }, results] = await Promise.all([
    requireSagaContext(ids),
    searchForUi(ids, query.q ?? "", query.mode !== "hybrid")
  ]);
  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="search">
      <section>
        <div className="eyebrow">Current Saga + World canon</div>
        <h1 className="page-title">Search</h1>
        <p className="muted">Search calls only `search_for_ui` and excludes sibling Sagas through the foundation boundary.</p>
      </section>
      <form className="card form-stack">
        <label className="field"><span>Query</span><input className="input" name="q" defaultValue={query.q ?? ""} placeholder="Search canon..." /></label>
        <label className="field"><span>Mode</span><select className="select" name="mode" defaultValue={query.mode ?? "literal"}><option value="literal">Literal</option><option value="hybrid">Hybrid</option></select></label>
        <button className="button" type="submit">Search</button>
      </form>
      <div className="entity-list">
        {results.map((result) => (
          <Link className="entity-row" key={`${result.source_kind}:${result.source_entity_id}`} href={result.source_entity_type ? `${sagaPath(ids)}/entities/${result.source_entity_type}/${result.source_entity_id}` : `${sagaPath(ids)}/search?q=${encodeURIComponent(query.q ?? "")}`}>
            <span><span className="chip">{result.source_entity_type ?? result.source_kind}</span><strong style={{ display: "block", marginTop: 6 }}>{result.snippet}</strong></span>
            <span className="chip sage">{result.canon_state}</span>
          </Link>
        ))}
        {query.q && !results.length ? <div className="card">No match. Create a quick stub from Stage or add canon manually.</div> : null}
      </div>
    </SanctumShell>
  );
}
