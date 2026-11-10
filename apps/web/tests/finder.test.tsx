import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { WorldEntry } from "@/lib/world/model";
import type { DeskStore } from "@/components/desk/use-desk";
import type { SurfaceControlsRef } from "@/components/desk/surface-controls";
import { Finder } from "@/components/desk/finder";

const entry = (label: string, objectId: string, cardHere: WorldEntry["cardHere"] = null): WorldEntry => ({
  ref: { objectId: objectId as WorldEntry["ref"]["objectId"], label, kind: "character" },
  maturity: "ink",
  lifecycle: "active",
  kinds: ["character"],
  snippet: `${label} keeps a ledger of promises.`,
  updatedAt: "2026-11-04T00:00:00.000Z",
  cardHere
});

function renderFinder(search: ReturnType<typeof vi.fn>, pullIn = vi.fn(), onOpenLibrary = vi.fn()) {
  const controls: SurfaceControlsRef = {
    current: { landing: () => ({ x: 40, y: 60 }), reveal: vi.fn() }
  };
  render(
    <Finder
      store={{ search, pullIn } as unknown as DeskStore}
      controls={controls}
      onArrive={vi.fn()}
      onOpenLibrary={onOpenLibrary}
    />
  );
  return { controls, pullIn, onOpenLibrary };
}

afterEach(() => vi.restoreAllMocks());

describe("Finder", () => {
  it("exposes active results as a keyboard combobox and restores trigger focus on Escape", async () => {
    const search = vi.fn().mockResolvedValue([
      entry("Mara Vey", "11111111-1111-4111-8111-111111111111"),
      entry("The Drowned Bell", "22222222-2222-4222-8222-222222222222")
    ]);
    renderFinder(search);
    const user = userEvent.setup();
    const trigger = screen.getByRole("button", { name: "Search this world ⌘K" });

    await user.click(trigger);
    const field = screen.getByRole("combobox", { name: "Search this world" });
    await waitFor(() => expect(screen.getByRole("option", { name: /Mara Vey/ })).toBeDefined());
    expect(field.getAttribute("aria-activedescendant")).toContain("11111111");

    await user.keyboard("{ArrowDown}");
    expect(field.getAttribute("aria-activedescendant")).toContain("22222222");
    expect(screen.getByRole("option", { name: /The Drowned Bell/ }).getAttribute("aria-selected")).toBe("true");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Search this world" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("announces search failures and ignores a late result after dismissal", async () => {
    let resolve!: (entries: readonly WorldEntry[]) => void;
    const search = vi.fn().mockImplementation(() => new Promise<readonly WorldEntry[]>((done) => { resolve = done; }));
    renderFinder(search);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Search this world ⌘K" }));
    const field = screen.getByRole("combobox", { name: "Search this world" });
    await user.type(field, "mara");
    fireEvent.keyDown(field, { key: "Escape" });
    resolve([entry("Late result", "33333333-3333-4333-8333-333333333333")]);
    await waitFor(() => expect(screen.queryByText("Late result")).toBeNull());
  });

  it("keeps a failed search distinct from no matches and retries the read", async () => {
    let attempts = 0;
    const search = vi.fn().mockImplementation(async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("offline");
      return [entry("Recovered result", "33333333-3333-4333-8333-333333333333")];
    });
    renderFinder(search);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Search this world ⌘K" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Search could not load");
    expect(screen.queryByText(/Nothing in this world yet/i)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("option", { name: /Recovered result/ })).toBeDefined();
  });

  it("inspects an unplaced result without changing the composition", async () => {
    const search = vi.fn().mockResolvedValue([entry("The Lighthouse", "44444444-4444-4444-8444-444444444444")]);
    const pullIn = vi.fn();
    renderFinder(search, pullIn);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Search this world ⌘K" }));
    await waitFor(() => expect(screen.getByRole("option", { name: /The Lighthouse/ })).toBeDefined());
    await user.click(screen.getByRole("option", { name: /The Lighthouse/ }));
    expect(screen.getByRole("complementary", { name: "Preview The Lighthouse" })).toBeDefined();
    expect(pullIn).not.toHaveBeenCalled();
  });

  it.each(["rejected", "empty"])("keeps the panel open when explicit pull-in is %s", async failure => {
    const search = vi.fn().mockResolvedValue([entry("The Lighthouse", "44444444-4444-4444-8444-444444444444")]);
    const pullIn = failure === "rejected" ? vi.fn().mockRejectedValue(new Error("offline")) : vi.fn().mockResolvedValue([]);
    renderFinder(search, pullIn);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Search this world ⌘K" }));
    await waitFor(() => expect(screen.getByRole("option", { name: /The Lighthouse/ })).toBeDefined());
    await user.click(screen.getByRole("button", { name: "Bring in" }));
    expect((await screen.findByRole("alert")).textContent).toContain("could not be brought in");
    expect((screen.getByRole("combobox", { name: "Search this world" }) as HTMLInputElement).disabled).toBe(false);
  });

  it("carries the current query into the full Library", async () => {
    const search = vi.fn().mockResolvedValue([]);
    const onOpenLibrary = vi.fn();
    renderFinder(search, vi.fn(), onOpenLibrary);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Search this world ⌘K" }));
    await user.type(screen.getByRole("combobox", { name: "Search this world" }), "ironshore");
    await user.click(screen.getByRole("button", { name: "Open the Library" }));
    expect(onOpenLibrary).toHaveBeenCalledWith("ironshore");
  });
});


