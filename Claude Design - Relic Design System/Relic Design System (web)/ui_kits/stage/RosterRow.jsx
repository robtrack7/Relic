// ============================================================
// Relic — Stage UI Kit · NPC + scene roster
// Pinning sets an amber left rule on the card.
// ============================================================

const ROSTER = [
  { id: 1, name: "Seraphine Valdrus", kind: "NPC · Merchant · Present",  tone: "Cagey. Speaks in half-sentences when the deed is mentioned." },
  { id: 2, name: "The Pale Broker",   kind: "NPC · Unknown · Referenced", tone: "Never seen. Names of go-betweens only." },
  { id: 3, name: "The Drowning Rat",  kind: "Location · Current scene",   tone: "Low candle-light. Rain on slate. The hearth crackling." },
  { id: 4, name: "Tobin Marrow",      kind: "NPC · Scribe · Nearby",      tone: "Eavesdropping from the corner table. Wants paid." },
  { id: 5, name: "Captain Vell",      kind: "NPC · Guard · Approaching",  tone: "Asking after Maren. Not yet inside the tavern." },
  { id: 6, name: "House Kael",        kind: "Faction · Antagonist",       tone: "Off-screen. Their reach is the threat." },
];

function RosterRow({ pinnedId, onPin }) {
  return (
    <>
      <div className="roster-label">
        <div className="roster-label-text">In scene · roster</div>
        <div className="roster-label-bar" />
      </div>
      <div className="roster">
        {ROSTER.map(r => (
          <button key={r.id}
                  className={"roster-card" + (pinnedId === r.id ? " is-pinned" : "")}
                  onClick={() => onPin(pinnedId === r.id ? null : r.id)}>
            <div className="roster-name">{r.name}</div>
            <div className="roster-meta">{r.kind}</div>
            <div className="roster-tone">{r.tone}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function getRoster(id) { return ROSTER.find(r => r.id === id); }

Object.assign(window, { RosterRow, getRoster });
