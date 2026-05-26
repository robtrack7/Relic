// ============================================================
// Relic — Sanctum UI Kit · primitives
// Buttons, badges, chips, eyebrows. Stateless, cosmetic.
// ============================================================

function Eyebrow({ children, accent }) {
  return (
    <div className={"eyebrow" + (accent ? " eyebrow-accent" : "")}>{children}</div>
  );
}

function SectionLabel({ children }) {
  return <div className="section-label">{children}</div>;
}

function Btn({ variant = "secondary", size, children, onClick, icon }) {
  const cls = ["btn", "btn-" + variant];
  if (size) cls.push("btn-" + size);
  if (icon) cls.push("btn-icon");
  return <button className={cls.join(" ")} onClick={onClick}>{children}</button>;
}

function Badge({ tone = "stone", children }) {
  return <span className={"badge badge-" + tone}>{children}</span>;
}

function ThreadChip({ state, children }) {
  const glyph = { active: "◆", loose: "◈", dormant: "○", resolved: "✓" }[state];
  return <span className={"thread-chip thread-" + state}>{glyph} {children}</span>;
}

function Avatar({ initials = "GM" }) {
  return <div className="avatar">{initials}</div>;
}

function Divider() {
  return <div className="divider" />;
}

function Kbd({ children }) {
  return <span className="kbd">{children}</span>;
}

// Tiny inline-svg icons — Lucide-shaped, stroke-1.5, ~16px.
// Kept here so the kit doesn't reach out to a CDN.
const Icon = {
  search: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
  ),
  plus: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
  ),
  more: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
  ),
  chevronRight: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
  ),
  link: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.71"/></svg>
  ),
  filter: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
  ),
  sparkle: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>
  ),
};

Object.assign(window, { Eyebrow, SectionLabel, Btn, Badge, ThreadChip, Avatar, Divider, Kbd, Icon });
