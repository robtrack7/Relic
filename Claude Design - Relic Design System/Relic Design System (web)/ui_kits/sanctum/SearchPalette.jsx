// ============================================================
// Relic — Sanctum UI Kit · ⌘K command palette
// Parchment surface, mono labels, entity-coloured rows.
// ============================================================

const PALETTE_ROWS = [
  { kind: "npc",      title: "Seraphine Valdrus", meta: "NPC · Merchant · Ashfen" },
  { kind: "location", title: "The Drowning Rat",   meta: "Location · Tavern · Ashfen" },
  { kind: "quest",    title: "The Thornwood Accord", meta: "Quest · Active · Session 14" },
  { kind: "faction",  title: "House Kael",         meta: "Faction · Antagonist · Ashfen" },
  { kind: "npc",      title: "Tobin Marrow",       meta: "NPC · Scribe · Stub" },
  { kind: "location", title: "Eastern Gate",       meta: "Location · 2 pins" },
];

function SearchPalette({ open, initialQuery, onClose }) {
  const [q, setQ] = React.useState("");
  React.useEffect(() => {
    if (open) setQ(initialQuery || "");
  }, [open, initialQuery]);
  const rows = q ? PALETTE_ROWS.filter(r => r.title.toLowerCase().includes(q.toLowerCase())) : PALETTE_ROWS;
  if (!open) return null;
  return (
    <div className="palette-scrim" onClick={onClose}>
      <div className="palette" onClick={e => e.stopPropagation()}>
        <div className="palette-input-row">
          {Icon.search}
          <input autoFocus
                 placeholder="Search saga — NPCs, locations, lore, rules…"
                 value={q}
                 onChange={e => setQ(e.target.value)}
                 className="palette-input" />
          <Kbd>esc</Kbd>
        </div>
        <div className="palette-section">
          <div className="palette-section-label">Entities · {rows.length} match{rows.length === 1 ? "" : "es"}</div>
          <ul className="palette-list">
            {rows.map(r => (
              <li key={r.title} className={"palette-row pr-" + r.kind}>
                <span className="palette-row-title">{r.title}</span>
                <span className="palette-row-meta">{r.meta}</span>
                <Kbd>↵</Kbd>
              </li>
            ))}
            {rows.length === 0 && (
              <li className="palette-empty">No matches. Try a different name.</li>
            )}
          </ul>
        </div>
        <div className="palette-footer">
          <span className="palette-footer-section"><Kbd>↑↓</Kbd> navigate</span>
          <span className="palette-footer-section"><Kbd>↵</Kbd> open</span>
          <span className="palette-footer-section palette-footer-right">{Icon.sparkle} Ask Relic — type a question</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SearchPalette });
