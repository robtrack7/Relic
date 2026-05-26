// ============================================================
// Relic — Stage UI Kit · lookup row + Quick Create (AI)
// Search saga inline. Generate NPC/item/etc with AI assistance —
// drafts drop into the Sanctum for GM review, never auto-canon.
// ============================================================

const LOOKUP_INDEX = [
  { title: "Drowning Rat — tavern",     meta: "Location · Ashfen · 4 pins",        kind: "location" },
  { title: "Drowned Court",              meta: "Faction · Smugglers · Draft",       kind: "faction" },
  { title: "Drow Bracelet, The",         meta: "Item · GM Only · Stub",             kind: "item" },
  { title: "Drowning ritual (folk lore)", meta: "Lore · Coastal traditions",        kind: "lore" },
  { title: "Drowning Pact (rumour)",     meta: "Rumour · Heard S12",                kind: "rumour" },
  { title: "Maren Holst",                meta: "NPC · Guard · Deceased",            kind: "npc" },
  { title: "Seraphine Valdrus",          meta: "NPC · Merchant · Alive",            kind: "npc" },
  { title: "The Thornwood Accord",       meta: "Quest · Active · Session 14",       kind: "quest" },
  { title: "Eastern Gate",               meta: "Location · Where Maren fell",       kind: "location" },
];

const QC_KINDS = ["NPC", "Location", "Item", "Faction", "Lore", "Rumour"];

function QuickLookup() {
  const [q, setQ] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [seedKind, setSeedKind] = React.useState("NPC");
  const [draft, setDraft] = React.useState("");

  const results = q
    ? LOOKUP_INDEX.filter(r => r.title.toLowerCase().includes(q.toLowerCase())).slice(0, 4)
    : [];
  const noMatch = q.trim().length >= 2 && results.length === 0;

  const openCreateWith = (kind) => {
    setSeedKind(kind);
    setDraft(q);
    setCreateOpen(true);
  };

  return (
    <div className="lookup-wrap">
      <div className="lookup-row">
        <div className="lookup">
          <span className="lookup-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </span>
          <input className="lookup-input"
                 placeholder="Search saga — NPCs, locations, lore, rules…"
                 value={q}
                 onChange={e => setQ(e.target.value)} />
          <span className="kbd">⌘K</span>
        </div>
        <button className={"quick-create" + (createOpen ? " is-open" : "")}
                onClick={() => setCreateOpen(o => !o)}>
          <span className="qc-spark" aria-hidden="true">✦</span>
          Quick create
          <span className="kbd kbd-alt">⌘N</span>
        </button>
      </div>

      {!createOpen && results.length > 0 && (
        <div className="lookup-results">
          {results.map((r, i) => (
            <div key={i} className="lookup-result">
              <div className="lookup-result-title">{r.title}</div>
              <div className="lookup-result-meta">{r.meta}</div>
            </div>
          ))}
        </div>
      )}

      {!createOpen && noMatch && (
        <div className="lookup-empty">
          <div className="lookup-empty-line">
            <span className="lookup-empty-icon" aria-hidden="true">✦</span>
            <span className="lookup-empty-q">No saga match for <em>"{q}"</em></span>
          </div>
          <div className="lookup-empty-cta">
            <span className="lookup-empty-label">Generate as</span>
            {QC_KINDS.slice(0, 4).map(k => (
              <button key={k} className="qc-pill" onClick={() => openCreateWith(k)}>{k}</button>
            ))}
            <button className="qc-pill qc-pill-more" onClick={() => openCreateWith("NPC")}>more…</button>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="qc-panel" role="dialog" aria-label="Quick create with AI">
          <div className="qc-head">
            <div>
              <div className="qc-eyebrow"><span className="qc-spark" aria-hidden="true">✦</span> Generate with AI</div>
              <div className="qc-hint">Drafts land in Sanctum · Review for canon · Won't appear to players</div>
            </div>
            <button className="qc-close" onClick={() => setCreateOpen(false)} aria-label="Close">✕</button>
          </div>

          <div className="qc-types">
            {QC_KINDS.map(k => (
              <button key={k}
                      className={"qc-type" + (k === seedKind ? " is-active" : "")}
                      onClick={() => setSeedKind(k)}>
                {k}
              </button>
            ))}
          </div>

          <div className="qc-prompt">
            <textarea className="qc-input"
                      placeholder={"A " + seedKind.toLowerCase() + " — describe in a sentence. Tone, role, one detail you'll need to remember."}
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      rows={2}
                      autoFocus />
          </div>

          <div className="qc-foot">
            <div className="qc-context">
              <span className="qc-dot" /> Will draw on: <em>scene tone</em>, <em>pinned subject</em>, <em>active threads</em>
            </div>
            <div className="qc-foot-actions">
              <button className="qc-cancel" onClick={() => setCreateOpen(false)}>Cancel</button>
              <button className="qc-go" disabled={!draft.trim()}>
                Generate <span className="kbd kbd-alt">⌥↩</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { QuickLookup });
