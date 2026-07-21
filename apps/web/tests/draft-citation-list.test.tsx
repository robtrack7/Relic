import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DraftCitationList } from "@/components/relic-draft/DraftCitationList";

const reviewRoot = "/app/w/workspace/world/world/saga/saga";

describe("DraftCitationList", () => {
  it("opens exact transcript evidence with a timestamped Session Review deep link", () => {
    render(<DraftCitationList sagaRoot={reviewRoot} citations={[{
      status: "available",
      source_kind: "transcript_segment",
      label: "Transcript evidence",
      frozen_excerpt: "The sealed gate opened.",
      current_text: "The sealed gate opened.",
      start_seconds: 62,
      end_seconds: 78,
      session_id: "session",
      drift_state: "exact",
    }]} />);

    fireEvent.click(screen.getByText("Transcript · 1:02–1:18"));
    expect(screen.getAllByText("The sealed gate opened.")).toHaveLength(2);
    expect(screen.getByText("Matches the current transcript")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open cited transcript segment" }).getAttribute("href"))
      .toBe(`${reviewRoot}/sessions/session/review#transcript-segment-62-78`);
  });

  it("shows frozen and current text for edited transcript drift", () => {
    render(<DraftCitationList sagaRoot={reviewRoot} citations={[{
      status: "available",
      source_kind: "transcript_segment",
      label: "Transcript evidence",
      frozen_excerpt: "The old gate opened.",
      current_text: "The sealed gate opened.",
      start_seconds: 0,
      end_seconds: 18,
      session_id: "session",
      drift_state: "edited",
    }]} />);

    fireEvent.click(screen.getByText("Transcript · 0:00–0:18"));
    expect(screen.getByText("Edited after citation")).toBeTruthy();
    expect(screen.getByText("The old gate opened.")).toBeTruthy();
    expect(screen.getByText("The sealed gate opened.")).toBeTruthy();
  });

  it("shows deleted transcript drift without hiding the frozen evidence", () => {
    render(<DraftCitationList sagaRoot={reviewRoot} citations={[{
      status: "available",
      source_kind: "transcript_segment",
      label: "Transcript evidence",
      frozen_excerpt: "Mara crossed the bridge.",
      current_text: "Mara crossed the bridge.",
      start_seconds: 20,
      end_seconds: 32,
      session_id: "session",
      drift_state: "deleted",
    }]} />);

    fireEvent.click(screen.getByText("Transcript · 0:20–0:32"));
    expect(screen.getByText("Deleted after citation")).toBeTruthy();
    expect(screen.getAllByText("Mara crossed the bridge.")).toHaveLength(2);
  });

  it("renders pasted notes and GM summaries as untimestamped evidence", () => {
    render(<DraftCitationList sagaRoot={reviewRoot} citations={[
      { status: "available", source_kind: "pasted_text", label: "Pasted session notes", frozen_excerpt: "Rough table notes.", drift_state: "not_applicable" },
      { status: "available", source_kind: "gm_manual_summary", label: "GM manual summary", frozen_excerpt: "The bridge is open.", drift_state: "not_applicable" },
    ]} />);

    fireEvent.click(screen.getByText("Pasted session notes"));
    fireEvent.click(screen.getByText("GM manual summary"));
    expect(screen.getByText("Rough table notes.")).toBeTruthy();
    expect(screen.getByText("The bridge is open.")).toBeTruthy();
    expect(screen.getAllByText("Manual evidence has no timestamp.")).toHaveLength(2);
    expect(screen.queryByRole("link", { name: "Open cited transcript segment" })).toBeNull();
  });

  it("uses safe fallback copy for broken, unavailable, denied, and unsupported citations", () => {
    render(<DraftCitationList sagaRoot={reviewRoot} citations={[
      { status: "broken", source_kind: "transcript_segment", label: "Source unavailable", drift_state: "unavailable" },
      { status: "unavailable", source_kind: "unknown", label: "Source unavailable", drift_state: "unavailable" },
      { status: "permission_denied", source_kind: "unknown", label: "Source unavailable", drift_state: "unavailable" },
      { status: "unsupported", source_kind: "existing_entity", label: "Unsupported source", drift_state: "not_applicable" },
    ]} />);

    screen.getAllByText(/Source unavailable|Unsupported source/).forEach((summary) => fireEvent.click(summary));
    expect(screen.getAllByText("This evidence cannot be shown safely.").length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText("This source type is not inspectable in C4.")).toBeTruthy();
    expect(document.body.textContent).not.toContain("ffffffff-ffff");
    expect(document.body.textContent).not.toContain("sibling");
  });
});
