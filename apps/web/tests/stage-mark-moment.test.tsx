import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuickNote } from "@/components/relic-draft/StageRuntimeDraft";

describe("Stage Mark Moment placement", () => {
  it("keeps Mark Moment in Note and disables it until recording", () => {
    render(<QuickNote scene="The Gate" busy={false} recording={false} onClose={vi.fn()} onSave={vi.fn()} onMark={vi.fn()} />);
    expect(screen.getByRole("button", { name: /mark moment/i }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Available while recording.")).toBeTruthy();
  });

  it("submits an optional label in two taps from the five-button rail Note action", () => {
    const onMark = vi.fn(async () => undefined);
    render(<QuickNote scene="The Gate" busy={false} recording onClose={vi.fn()} onSave={vi.fn()} onMark={onMark} />);
    fireEvent.change(screen.getByPlaceholderText("decision, lie, secret…"), { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /mark moment/i }));
    expect(onMark).toHaveBeenCalledWith("secret");
  });
});
