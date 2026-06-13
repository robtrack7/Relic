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
  it("renders v0.4 navigation, context controls, and Relic Guide sidecar", () => {
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
    expect(within(nav).getByRole("link", { name: "Library" }).getAttribute("href")).toBe(
      "/app/w/workspace-1/world/world-1/saga/saga-1/entities"
    );
    expect(within(nav).getByRole("link", { name: "Prepare" }).getAttribute("href")).toBe(
      "/app/w/workspace-1/world/world-1/saga/saga-1/sessions"
    );
    expect(within(nav).queryByRole("link", { name: "Ask" })).toBeNull();
    expect(screen.getByRole("searchbox", { name: "Search saga canon" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Relic Guide" }).getAttribute("href")).toBe(
      "/app/w/workspace-1/world/world-1/saga/saga-1/guide"
    );
    expect(screen.getByRole("link", { name: "Create" }).getAttribute("href")).toBe(
      "/app/w/workspace-1/world/world-1/saga/saga-1/entities/new"
    );
    expect(screen.getByRole("complementary", { name: "Relic Guide" })).toBeTruthy();
    expect(screen.getByText("Ask current canon and inspect cited sources before acting.")).toBeTruthy();
    expect(screen.getByText("Lantern House")).toBeTruthy();
    expect(screen.getByText("Thornwood")).toBeTruthy();
    expect(screen.getByText("The Thornwood Accord")).toBeTruthy();
  });
});
