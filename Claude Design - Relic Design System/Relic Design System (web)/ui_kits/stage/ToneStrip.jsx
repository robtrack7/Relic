// ============================================================
// Relic — Stage UI Kit · tone strip
// Quick-set the scene's tone — drives ambient suggestions, etc.
// ============================================================

const TONES = ["Hush", "Charged", "Lyrical", "Cruel", "Comic", "Lonely"];

function ToneStrip({ active, onPick }) {
  return (
    <div className="tone-strip">
      {TONES.map(t => (
        <button key={t}
                className={"tone-btn" + (active === t ? " is-active" : "")}
                onClick={() => onPick(active === t ? null : t)}>
          {t}
        </button>
      ))}
    </div>
  );
}

Object.assign(window, { ToneStrip });
