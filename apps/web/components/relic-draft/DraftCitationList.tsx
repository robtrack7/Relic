import Link from "next/link";
import { formatTimestamp } from "@/lib/format";
import type { DraftCitationContext } from "@/lib/types";

function transcriptLabel(citation: DraftCitationContext) {
  if (typeof citation.start_seconds !== "number" || typeof citation.end_seconds !== "number") return citation.label;
  return `Transcript · ${formatTimestamp(citation.start_seconds)}–${formatTimestamp(citation.end_seconds)}`;
}

function driftCopy(state: DraftCitationContext["drift_state"]) {
  if (state === "edited") return "Edited after citation";
  if (state === "deleted") return "Deleted after citation";
  if (state === "exact") return "Matches the current transcript";
  return null;
}

export function transcriptSegmentAnchor(start: number, end: number) {
  return `transcript-segment-${Math.max(0, Math.floor(start))}-${Math.max(0, Math.floor(end))}`;
}

export function DraftCitationList({ sagaRoot, citations }: { sagaRoot: string; citations: DraftCitationContext[] }) {
  return (
    <div className="draft-citations" aria-label="Draft citations">
      {citations.map((citation, index) => {
        const transcript = citation.source_kind === "transcript_segment";
        const label = transcript ? transcriptLabel(citation) : citation.label;
        const drift = driftCopy(citation.drift_state);
        const hasTranscriptLink = transcript
          && citation.status === "available"
          && citation.session_id
          && typeof citation.start_seconds === "number"
          && typeof citation.end_seconds === "number";

        return (
          <details className={`draft-citation ${citation.status} ${citation.drift_state}`} key={`${label}-${index}`}>
            <summary>
              <span>{label}</span>
              {drift && <span className={`citation-state ${citation.drift_state}`}>{drift}</span>}
            </summary>
            <div className="draft-citation-body">
              {citation.status === "unsupported" ? (
                <p className="citation-safe-state">This source type is not inspectable in C4.</p>
              ) : citation.status !== "available" ? (
                <>
                  <p className="citation-safe-state">This evidence cannot be shown safely.</p>
                  {citation.status === "broken" && citation.frozen_excerpt && (
                    <div className="citation-excerpt"><span>Frozen cited excerpt</span><p>{citation.frozen_excerpt}</p></div>
                  )}
                </>
              ) : (
                <>
                  <div className="citation-excerpt">
                    <span>{transcript ? "Frozen cited excerpt" : "Evidence"}</span>
                    <p>{citation.frozen_excerpt || "The saved evidence is unavailable."}</p>
                  </div>
                  {transcript ? (
                    <div className="citation-excerpt current">
                      <span>Current transcript segment</span>
                      <p>{citation.current_text || "The current transcript segment is no longer available."}</p>
                    </div>
                  ) : (
                    <p className="citation-no-time">Manual evidence has no timestamp.</p>
                  )}
                  {hasTranscriptLink && (
                    <Link
                      className="citation-deep-link"
                      href={`${sagaRoot}/sessions/${citation.session_id}/review#${transcriptSegmentAnchor(citation.start_seconds!, citation.end_seconds!)}`}
                    >
                      Open cited transcript segment
                    </Link>
                  )}
                </>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
