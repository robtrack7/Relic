// wf-bits.jsx — Relic icon registry + shared primitives (adapted from DS Bits.jsx)
const ICONS = {
  home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5"/><path d="M9.5 21v-6h5v6"/></>,
  threads: <><path d="M6 5 18 19"/><path d="M18 5 6 19"/><circle cx="12" cy="12" r="2.2"/><circle cx="6" cy="5" r="1.3"/><circle cx="18" cy="5" r="1.3"/><circle cx="6" cy="19" r="1.3"/><circle cx="18" cy="19" r="1.3"/></>,
  library: <><path d="M12 6.5C10.5 5 8 4.5 4 4.8V18c4-.3 6.5.2 8 1.7"/><path d="M12 6.5C13.5 5 16 4.5 20 4.8V18c-4-.3-6.5.2-8 1.7"/><path d="M12 6.5v13"/></>,
  prepare: <><path d="M19 4c-3 0-9 1.5-12 7-1.5 2.7-2 5.5-2 8"/><path d="M19 4c0 4-1.5 8-5 10.5-2 1.4-4.5 2-7 2"/><path d="M5 19h7"/></>,
  sessions: <><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 9.5h16"/><path d="M8 3.5v3M16 3.5v3"/></>,
  review: <><path d="M14 4H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z"/><path d="M14 4v5h5"/><path d="M9 14.5l2 2 4-4.5"/></>,
  export: <><path d="M12 15V4"/><path d="m8 8 4-4 4 4"/><path d="M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/></>,
  settings: <><circle cx="12" cy="12" r="3.2"/><path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.4-3.4"/></>,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/></>,
  chevDown: <path d="m6 9 6 6 6-6"/>,
  chevLeft: <path d="m15 18-6-6 6-6"/>,
  chevRight: <path d="m9 18 6-6-6-6"/>,
  spark: <><path d="M12 3c.6 4.2 1.8 5.4 6 6-4.2.6-5.4 1.8-6 6-.6-4.2-1.8-5.4-6-6 4.2-.6 5.4-1.8 6-6Z"/><path d="M18.5 4.5c.2 1.4.6 1.8 2 2-1.4.2-1.8.6-2 2-.2-1.4-.6-1.8-2-2 1.4-.2 1.8-.6 2-2Z"/></>,
  send: <><path d="M21 4 3 11l6 2.5L11 20l3.5-6L21 4Z"/><path d="m9 13.5 5.5-5.5"/></>,
  crown: <><path d="M4 8.5 7 16h10l3-7.5-4.5 3.2L12 5 8.5 11.7 4 8.5Z"/><path d="M7 19h10"/></>,
  flame: <><path d="M12 3c0 3-4 4.5-4 9a4 4 0 0 0 8 0c0-1.7-1-3-1.8-4 .3 1.5-.5 2.5-1.2 2.5-1 0-1.2-1.2-.8-2.4C12.8 6.5 12 4.2 12 3Z"/></>,
  grid: <><rect x="4" y="4" width="7" height="7" rx="1.2"/><rect x="13" y="4" width="7" height="7" rx="1.2"/><rect x="4" y="13" width="7" height="7" rx="1.2"/><rect x="13" y="13" width="7" height="7" rx="1.2"/></>,
  clock: <><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/></>,
  target: <><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/></>,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 12.5h6M9 16h6"/></>,
  notes: <><path d="M5 4.5h14v11l-4 4.5H5z"/><path d="M19 15.5h-4v4.5"/><path d="M8.5 9h7M8.5 12.5h4"/></>,
  users: <><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.5-3 2.8-4.5 5.5-4.5s5 1.5 5.5 4.5"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6"/><path d="M17.5 14.8c2 .6 3.2 2 3.5 4.2"/></>,
  checklist: <><path d="M4 6.5 5.5 8 8 5"/><path d="M4 13l1.5 1.5L8 11.5"/><path d="M4 19l1.5 1.5L8 18"/><path d="M11 6.5h9M11 13h9M11 19.5h9"/></>,
  arrowRight: <><path d="M4 12h15"/><path d="m13 6 6 6-6 6"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  more: <><circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none"/></>,
  check: <path d="m5 12.5 4.5 4.5L19 7"/>,
  checkCircle: <><circle cx="12" cy="12" r="8.5"/><path d="m8.5 12 2.5 2.5 4.5-5"/></>,
  pin: <><path d="M12 3 9 6l-3 .6 5.4 5.4L8 18l4-3 3 3-1.2-5.6L19 7l-3-.6Z"/></>,
  feather: <><path d="M19 5c-3 0-9 1.5-12 7-1.5 2.7-2 5.5-2 8"/><path d="M19 5c0 4-1.5 8-5 10.5-2 1.4-4.5 2-7 2"/><path d="M6.5 18.5h6"/></>,
  anchor: <><circle cx="12" cy="6" r="2"/><path d="M12 8v11"/><path d="M6 12H4.5c0 4 3.5 6.5 7.5 6.5s7.5-2.5 7.5-6.5H18"/><path d="M9 11h6"/></>,
  dice: <><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="15" r="1" fill="currentColor" stroke="none"/></>,
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/>,
  record: <><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.4" fill="currentColor" stroke="none"/></>,
  download: <><path d="M12 15V4"/><path d="m8 11 4 4 4-4"/><path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/></>,
  upload: <><path d="M12 9V20"/><path d="m8 13 4-4 4 4"/><path d="M3 5v-2a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2"/></>,
  wifiOff: <><path d="M2 2l20 20"/><path d="M8.5 8.5A7 7 0 0 0 5 12"/><path d="M19 12a7 7 0 0 0-3.1-5.8"/><path d="M10.7 10.7A3.5 3.5 0 0 0 8.5 14"/><path d="M15.5 14a3.5 3.5 0 0 0-.9-2.3"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4"/></>,
  alert: <><circle cx="12" cy="12" r="8.5"/><path d="M12 8v5"/><circle cx="12" cy="16.5" r="0.7" fill="currentColor" stroke="none"/></>,
  info: <><circle cx="12" cy="12" r="8.5"/><path d="M12 16v-5"/><circle cx="12" cy="7.5" r="0.7" fill="currentColor" stroke="none"/></>,
  diff: <><path d="M12 4v16"/><path d="M4 12h16"/><path d="M6 7l-3 3 3 3"/><path d="M18 7l3 3-3 3"/></>,
  refresh: <><path d="M3 12a9 9 0 1 0 3.05-6.6"/><path d="M3 5v4h4"/></>,
  trash: <><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6 18 20H6L5 6"/><path d="M10 11v6M14 11v6"/></>,
  archive: <><path d="M21 8V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8"/><rect x="2" y="3" width="20" height="5" rx="1"/><path d="M10 12h4"/></>,
  flag: <><path d="M5 21V4"/><path d="M5 5h11l-2 3 2 3H5"/></>,
  map: <><path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z"/><path d="M9 4v14M15 6v14"/></>,
  x: <><path d="M18 6 6 18"/><path d="M6 6l12 12"/></>,
  star: <><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></>,
};

function I({ n, size = 18, sw = 1.6, fill = "none", cls = "" }) {
  return (
    <svg className={"i " + cls} width={size} height={size} viewBox="0 0 24 24"
         fill={fill} stroke="currentColor" strokeWidth={sw}
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[n] || null}
    </svg>
  );
}

function Seal({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="currentColor" opacity="0.18"/>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.2" opacity="0.5"/>
      <path d="M12 6.5c.5 3 1.5 4 4.5 4.5-3 .5-4 1.5-4.5 4.5-.5-3-1.5-4-4.5-4.5 3-.5 4-1.5 4.5-4.5Z" fill="currentColor" opacity="0.85"/>
    </svg>
  );
}

const TINTS = ["#8A6A4A","#6A6258","#8A3828","#496640","#6B5340","#7B5EA7","#6B8FA3","#B8702A"];
function tintFor(seed) {
  let h = 0;
  for (let i = 0; i < (seed||"").length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}
function Avatar({ name = "", initials, size = 32, cls = "" }) {
  const text = initials || name.split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const style = { background: tintFor(name || text), width: size, height: size, fontSize: Math.round(size * 0.38) };
  return <div className={"avatar " + cls} style={style}>{text}</div>;
}
function AvatarStack({ people = [], max = 4, more }) {
  const shown = people.slice(0, max);
  const extra = more != null ? more : people.length - shown.length;
  return (
    <div style={{ display:"flex" }}>
      {shown.map((p, i) => <Avatar key={i} name={p} style={{ marginLeft: i > 0 ? -8 : 0, border: "1.5px solid var(--bg-2)" }} />)}
      {extra > 0 && <div style={{ width:32, height:32, borderRadius:"50%", marginLeft:-8, background:"var(--bg-3)", border:"1.5px solid var(--bg-2)", display:"grid", placeItems:"center", fontFamily:"var(--font-mono)", fontSize:10, color:"var(--stone-700)" }}>+{extra}</div>}
    </div>
  );
}

function Dot({ kind = "", pulse }) {
  return <span className={"dot " + kind + (pulse ? " pulse" : "")} />;
}
function Chip({ tone = "stone", dot, dotKind, children, outline }) {
  if (outline) return <span className={"chip-outline " + outline}>{dot && <Dot kind={dotKind || tone} />}{children}</span>;
  return <span className={"chip " + tone}>{dot && <Dot kind={dotKind || ""} />}{children}</span>;
}
function Meter({ value = 0, max = 100, cls = "" }) {
  return <div className={"meter " + cls}><span style={{ width: Math.round((value / max) * 100) + "%" }} /></div>;
}
function SecLabel({ icon, count, children, action }) {
  return (
    <div className="sec-label">
      {icon && <I n={icon} size={13} />}
      <span>{children}</span>
      {count != null && <span className="count">{count}</span>}
      {action && <span style={{ marginLeft:"auto" }}>{action}</span>}
    </div>
  );
}

Object.assign(window, { I, Seal, Avatar, AvatarStack, Dot, Chip, Meter, SecLabel, tintFor, ICONS });
