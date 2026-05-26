import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SanctumShell } from "@/components/SanctumShell";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}));

vi.mock("@/app/actions", () => ({
  signOutAction: vi.fn()
}));

const params = { workspaceId: "workspace-1", worldId: "world-1", sagaId: "saga-1" };

describe("SanctumShell", () => {
  it("renders Ask as primary nav and Search as command affordance", () => {
    render(
      <SanctumShell
        params={params}
        workspace={{ name: "Lantern House" }}
        world={{ name: "Thornwood" }}
        saga={{ name: "The Thornwood Accord" }}
      >
        <p>Shell content</p>
      </SanctumShell>
    );

    const nav = screen.getByRole("navigation", { name: "Sanctum" });
    expect(within(nav).getByRole("link", { name: "Ask" }).getAttribute("href")).toBe(
      "/app/w/workspace-1/world/world-1/saga/saga-1/ask"
    );
    expect(within(nav).queryByRole("link", { name: "Search" })).toBeNull();
    expect(screen.getByText("Search saga canon")).toBeTruthy();
    expect(screen.getByText("Lantern House")).toBeTruthy();
    expect(screen.getByText("Thornwood")).toBeTruthy();
    expect(screen.getByText("The Thornwood Accord")).toBeTruthy();
  });
});
