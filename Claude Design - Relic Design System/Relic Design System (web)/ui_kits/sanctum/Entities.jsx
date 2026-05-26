// ============================================================
// Relic — Sanctum UI Kit · Entities view
// Filterable grid of NPCs, Locations, Quests, Factions.
// ============================================================

const ENTITIES = [
  { kind: "npc",      title: "Seraphine Valdrus", desc: "A gaunt woman with silver-streaked hair who frequents the Drowning Rat. Her true allegiance is unknown to the party.", foot: "Ashfen · Alive", tag: { tone: "ink", label: "GM Only" } },
  { kind: "location", title: "The Drowning Rat",  desc: "A waterfront inn known for cheap ale and expensive secrets. The party's base of operations since Session 3.", foot: "Ashfen · 4 pins",  tag: { tone: "sage", label: "Revealed" } },
  { kind: "quest",    title: "The Thornwood Accord", desc: "Recover the stolen deed before House Kael brokers the sale. The party has until the new moon.", foot: "Session 14 · 2 objectives", tag: { tone: "amber", label: "Canon" } },
  { kind: "faction",  title: "House Kael", desc: "A noble house with deep pockets and deeper corruption. Controls the southern docks through proxy merchants.", foot: "Ashfen · 6 members", tag: { tone: "stone", label: "Draft" } },
  { kind: "npc",      title: "Tobin Marrow",      desc: "Apprentice scribe. Reads everything that crosses his desk; sells some of it.", foot: "Ashfen · Alive", tag: { tone: "stone", label: "Stub" } },
  { kind: "location", title: "Eastern Gate",     desc: "Where Maren fell. The party still avoids the alley.", foot: "Ashfen · 2 pins",  tag: { tone: "sage", label: "Revealed" } },
  { kind: "npc",      title: "Maren Holst",     desc: "A guard captain who knew too much. Status changed last session.", foot: "Ashfen · Deceased", tag: { tone: "rust", label: "Deceased" } },
  { kind: "faction",  title: "The Drowned Court", desc: "A smuggling consortium operating through the harbour district.", foot: "Ashfen · 4 members", tag: { tone: "stone", label: "Draft" } },
];

const KINDS = [
  { id: "all",      label: "All",       count: ENTITIES.length },
  { id: "npc",      label: "NPCs",      count: ENTITIES.filter(e => e.kind === "npc").length },
  { id: "location", label: "Locations", count: ENTITIES.filter(e => e.kind === "location").length },
  { id: "quest",    label: "Quests",    count: ENTITIES.filter(e => e.kind === "quest").length },
  { id: "faction",  label: "Factions",  count: ENTITIES.filter(e => e.kind === "faction").length },
];

function Entities() {
  const [filter, setFilter] = React.useState("all");
  const shown = filter === "all" ? ENTITIES : ENTITIES.filter(e => e.kind === filter);

  return (
    <div className="entities">
      <div className="page-head">
        <div>
          <h1 className="page-title">Entities</h1>
          <p className="page-sub">Everyone, everywhere, everything in the saga.</p>
        </div>
        <div className="page-actions">
          <div className="search-stub">{Icon.search}<span>Search saga…</span><Kbd>⌘K</Kbd></div>
          <Btn variant="amber" size="sm">{Icon.plus} New entity</Btn>
        </div>
      </div>

      <div className="kind-tabs">
        {KINDS.map(k => (
          <button key={k.id}
                  className={"kind-tab" + (filter === k.id ? " is-active" : "")}
                  onClick={() => setFilter(k.id)}>
            <span>{k.label}</span>
            <span className="kind-count">{k.count}</span>
          </button>
        ))}
      </div>

      <div className="entity-grid">
        {shown.map(e => (
          <article key={e.title} className={"entity-card e-" + e.kind}>
            <div className="entity-eyebrow">{e.kind === "npc" ? "NPC" : e.kind === "location" ? "Location" : e.kind === "quest" ? "Quest" : "Faction"}</div>
            <h3 className="entity-title">{e.title}</h3>
            <p className="entity-desc">{e.desc}</p>
            <div className="entity-foot">
              <span className="entity-meta">{e.foot}</span>
              <Badge tone={e.tag.tone}>{e.tag.label}</Badge>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Entities });
