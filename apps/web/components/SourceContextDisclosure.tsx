"use client";

import { useState } from "react";
import type { DraftCitationContext } from "@/lib/data";

export type SourceContextCitation = {
  sourceId: string;
  context: DraftCitationContext;
};

export function SourceContextDisclosure({
  citation,
  index
}: {
  citation: SourceContextCitation;
  index: number;
}) {
  const [open, setOpen] = useState(false);
  const context = citation.context;
  const safeLabel = context.label || "Source";
  return (
    <span className="guide-citation">
      <button
        type="button"
        className="guide-citation-marker"
        aria-label={`Source ${index + 1}: ${safeLabel}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((value) => !value);
          }
        }}
      >
        [{index + 1}]
      </button>
      {open && (
        <span className="guide-citation-popover" role="region" aria-label={`${safeLabel} evidence`}>
          <strong>{safeLabel}</strong>
          {context.status === "available" ? (
            <>
              {context.drift_state === "edited" && <span className="guide-evidence-warning">Edited after citation</span>}
              {context.drift_state === "deleted" && <span className="guide-evidence-warning">Deleted after citation</span>}
              <span>{context.frozen_excerpt || "Evidence excerpt unavailable."}</span>
              {context.current_text && context.current_text !== context.frozen_excerpt && (
                <span>Current context: {context.current_text}</span>
              )}
            </>
          ) : (
            <span>This evidence cannot be shown safely.</span>
          )}
        </span>
      )}
    </span>
  );
}
