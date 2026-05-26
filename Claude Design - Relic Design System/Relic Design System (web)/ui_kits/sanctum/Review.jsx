// ============================================================
// Relic — Sanctum UI Kit · Review view (approval queue)
// Diffs derived from session transcript; GM approves canon.
// ============================================================

const ITEMS = [
  {
    kind: "danger",
    type: "NPC Update · Status change",
    title: "Maren Holst",
    diffOld: "Alive",
    diffNew: "Deceased",
    diffTail: " — killed during the ambush at the eastern gate.",
    source: "Transcript · 01:23:45 — \"She doesn't make it out of the alley\"",
  },
  {
    kind: "new",
    type: "New entity · NPC",
    title: "The Pale Broker",
    diffNew: "New NPC introduced",
    diffTail: " — an unnamed contact referenced by Seraphine. Speaks only through intermediaries.",
    source: "Transcript · 02:11:08 — \"Tell the Pale Broker the deed is in play\"",
  },
  {
    kind: "progress",
    type: "Quest update · Objective complete",
    title: "The Thornwood Accord",
    diffNew: "\"Locate the deed's current holder\"",
    diffTail: " — party confirmed Seraphine has it.",
    source: "Transcript · 01:54:22 — player decision logged",
  },
  {
    kind: "new",
    type: "New entity · Location",
    title: "The Sallow Reach",
    diffNew: "New location introduced",
    diffTail: " — a swamp east of Ashfen, mentioned by Tobin.",
    source: "Transcript · 02:47:01 — narration",
  },
];

function ApprovalItem({ it, onAct }) {
  return (
    <article className={"approval-item is-" + it.kind}>
      <div className="approval-type">{it.type}</div>
      <h3 className="approval-title">{it.title}</h3>
      <p className="approval-diff">
        {it.diffOld && <><span>Status: </span><span className="diff-old">{it.diffOld}</span><span> → </span></>}
        <span className="diff-new">{it.diffNew}</span>
        <span>{it.diffTail}</span>
      </p>
      <div className="approval-source">{it.source}</div>
      <div className="approval-actions">
        <Btn variant="primary" size="xs" onClick={() => onAct("approve")}>Approve</Btn>
        <Btn variant="secondary" size="xs" onClick={() => onAct("edit")}>Edit</Btn>
        <Btn variant="ghost" size="xs" onClick={() => onAct("reject")}>Reject</Btn>
      </div>
    </article>
  );
}

function Review() {
  const [items, setItems] = React.useState(ITEMS);
  const [toast, setToast] = React.useState(null);
  const handle = (idx, action) => {
    setToast(action + "d · " + items[idx].title);
    setItems(items.filter((_, i) => i !== idx));
    setTimeout(() => setToast(null), 2200);
  };

  return (
    <div className="review">
      <div className="page-head">
        <div>
          <h1 className="page-title">Post-session review</h1>
          <p className="page-sub">Session 14 · {items.length} canon proposal{items.length === 1 ? "" : "s"} awaiting your decision.</p>
        </div>
        <div className="page-actions">
          <Btn variant="ghost" size="sm">Listen to transcript</Btn>
          <Btn variant="secondary" size="sm">Approve all safe</Btn>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="review-empty">
          <h3 className="t-display-md">The thread is held.</h3>
          <p>No proposals pending. Session 14 has been committed to canon.</p>
        </div>
      ) : (
        <div className="approval-stack">
          {items.map((it, i) => (
            <ApprovalItem key={it.title} it={it} onAct={(a) => handle(i, a)} />
          ))}
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

Object.assign(window, { Review });
