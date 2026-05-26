// ============================================================
// Relic — Stage UI Kit · side rules / lore peek
// Compact reference card for the entity currently in focus.
// ============================================================

function RulesPeek({ subject }) {
  const subj = subject || {
    name: "Pick an NPC or scene",
    kicker: "Stage · Peek",
    body: "Tap any roster card to bring its detail here. Players don't see this surface.",
    stats: [],
    tags: [],
  };

  // Hard-coded peek profiles for demo
  const PROFILES = {
    1: { kicker: "NPC · Merchant · GM Only", body: "Gaunt, silver hair, a smile that doesn't reach her eyes. Holds the deed. Believes the Pale Broker can be bargained with.", stats: [{k:"Resolve", v:"14"},{k:"Insight", v:"+2"}], tags: ["Canon","Has Item","GM Only"] },
    2: { kicker: "NPC · Unknown · Referenced", body: "Never appears on stage. Identified only through second-hand reports. Speaks through Tobin and a courier child known as Wren.", stats: [{k:"Unknown", v:"—"}], tags: ["Stub","Antagonist"] },
    3: { kicker: "Location · Tavern · Ashfen", body: "Three rooms above. Low ceilings. The barmaid is loyal to no one. Northern exit gives onto the harbour.", stats: [{k:"Occupants", v:"19"},{k:"Exits", v:"3"}], tags: ["Revealed","Player base"] },
    4: { kicker: "NPC · Scribe · Stub", body: "Apprentice scribe. Sees more than he says. Will speak for coin or for fear.", stats: [{k:"Greed", v:"high"}], tags: ["Stub","Information broker"] },
    5: { kicker: "NPC · Guard captain", body: "Asking after Maren. Has a writ from Captain Vell of the eastern watch. Visibly tired.", stats: [{k:"AC", v:"15"},{k:"HP", v:"38"}], tags: ["Threat","Lawful"] },
    6: { kicker: "Faction · Antagonist", body: "A noble house. Deep pockets, deeper corruption. Controls southern docks via proxy merchants. Currently moving against the party indirectly.", stats: [{k:"Members", v:"6"},{k:"Reach", v:"Ashfen"}], tags: ["Antagonist","Canon"] },
  };
  const p = subject ? PROFILES[subject.id] : null;
  return (
    <aside className="peek">
      <div className="peek-head">
        <div className="peek-label">Peek · GM only</div>
        <div className="kbd">⌘P</div>
      </div>
      <div>
        <div className="peek-card-kicker">{p ? p.kicker : "No subject pinned"}</div>
        <h3 className="peek-card-title">{subject ? subject.name : "Pick a roster card"}</h3>
      </div>
      <div className="peek-card-body">{p ? p.body : "Tap any roster tile to bring its detail panel here. The Stage shows only what the GM has the right to know in the moment."}</div>
      {p && p.stats.length > 0 && (
        <div className="peek-stats">
          {p.stats.map(s => (
            <div key={s.k} className="peek-stat">
              <div className="peek-stat-k">{s.k}</div>
              <div className="peek-stat-v">{s.v}</div>
            </div>
          ))}
        </div>
      )}
      {p && (
        <>
          <div className="peek-card-divider" />
          <div className="peek-tags">
            {p.tags.map(t => <span key={t} className="peek-tag">{t}</span>)}
          </div>
        </>
      )}
      <div className="peek-foot">
        <button className="peek-btn peek-btn-primary">Open in Sanctum</button>
        <button className="peek-btn peek-btn-secondary">Pin to scene</button>
      </div>
    </aside>
  );
}

Object.assign(window, { RulesPeek });
