// ============================================================
// Relic — Stage UI Kit · live transcript ticker
// Lines tick in every ~3s while recording. Read-only on Stage.
// ============================================================

const LINES = [
  { t: "01:23:45", speaker: "GM",        text: "She doesn't make it out of the alley.",                            kind: "speech" },
  { t: "01:23:52", speaker: "PLAYER · LIRA", text: "Wait — did anyone see Maren go down?",                          kind: "speech" },
  { t: "01:24:09", speaker: "PLAYER · ROAN", text: "I'm pulling the hood off. I need to see her face.",             kind: "speech" },
  { t: "01:24:17", speaker: null,        text: "Narration · The hood comes away. Maren's eyes are open. They are not seeing.", kind: "narration" },
  { t: "01:24:42", speaker: "GM",        text: "Roll a Wisdom save. The Drowning Rat suddenly seems very quiet.",   kind: "speech" },
  { t: "01:25:01", speaker: "PLAYER · LIRA", text: "Fourteen. With my proficiency, sixteen.",                       kind: "speech" },
  { t: "01:25:08", speaker: "GM",        text: "You catch a flash of silver hair, three tables over. Seraphine is here.", kind: "speech" },
  { t: "01:25:30", speaker: "PLAYER · ROAN", text: "I want to go to her. Slowly.",                                  kind: "speech" },
  { t: "01:25:38", speaker: null,        text: "Narration · Tobin slips out the back. No one notices but the GM.",  kind: "narration" },
];

function Transcript({ recording }) {
  const [visible, setVisible] = React.useState(3);
  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => {
      setVisible(v => Math.min(v + 1, LINES.length));
    }, 2800);
    return () => clearInterval(id);
  }, [recording]);
  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [visible]);
  const lines = LINES.slice(0, visible);
  return (
    <div className="transcript">
      <div className="transcript-head">
        <div className="transcript-title">Live transcript</div>
        <div className="transcript-len">{visible} / {LINES.length} lines</div>
      </div>
      <div className="transcript-body" ref={scrollRef}>
        {lines.map((l, i) => (
          <div key={i} className={"t-line" + (l.kind === "narration" ? " is-narration" : "")}>
            <div className="t-time">{l.t}</div>
            <div>
              {l.speaker && <span className="t-speaker">{l.speaker}<br /></span>}
              <span className="t-text">{l.text}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Transcript });
