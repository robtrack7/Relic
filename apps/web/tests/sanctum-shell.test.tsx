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
        workspace={{
          name: "Lantern House",
          hierarchy: {
            workspaces: [
              { id: "workspace-1", name: "Lantern House", target: params },
              { id: "workspace-2", name: "North House", target: { workspaceId: "workspace-2", worldId: "world-2", sagaId: "saga-3" } }
            ],
            worlds: [
              { id: "world-1", name: "Thornwood", target: params },
              { id: "world-2", name: "Salt March", target: { workspaceId: "workspace-1", worldId: "world-2", sagaId: "saga-2" } }
            ],
            sagas: [
              { id: "saga-1", name: "The Thornwood Accord", target: params },
              { id: "saga-2", name: "Ashes at Dawn", target: { workspaceId: "workspace-1", worldId: "world-1", sagaId: "saga-2" } }
            ]
          }
        }}
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
    const workspaceSwitcher = screen.getByRole("combobox", { name: "Workspace" });
    const worldSwitcher = screen.getByRole("combobox", { name: "World" });
    const sagaSwitcher = screen.getByRole("combobox", { name: "Saga" });
    expect(within(workspaceSwitcher).getByRole("option", { name: "North House" }).getAttribute("value")).toBe(
      "/app/w/workspace-2/world/world-2/saga/saga-3"
    );
    expect(within(worldSwitcher).getByRole("option", { name: "Salt March" }).getAttribute("value")).toBe(
      "/app/w/workspace-1/world/world-2/saga/saga-2"
    );
    expect(within(sagaSwitcher).getByRole("option", { name: "Ashes at Dawn" }).getAttribute("value")).toBe(
      "/app/w/workspace-1/world/world-1/saga/saga-2"
    );
    expect(within(sagaSwitcher).getByRole("option", { name: "+ New saga" }).getAttribute("value")).toContain(
      "/app/new-saga?workspaceId=workspace-1&worldId=world-1"
    );
  });

  it("disables all three context dropdowns while a Session is live", () => {
    render(
      <SanctumShell
        params={params}
        workspace={{
          name: "Lantern House",
          hierarchy: {
            switching_blocked: true,
            workspaces: [{ id: "workspace-1", name: "Lantern House", target: params }],
            worlds: [{ id: "world-1", name: "Thornwood", target: params }],
            sagas: [{ id: "saga-1", name: "The Thornwood Accord", target: params }]
          }
        }}
        world={{ name: "Thornwood" }}
        saga={{ name: "The Thornwood Accord" }}
      >
        <p>Live shell</p>
      </SanctumShell>
    );

    for (const label of ["Workspace", "World", "Saga"]) {
      expect(screen.getByRole("combobox", { name: label }).hasAttribute("disabled")).toBe(true);
    }
    expect(screen.getByText("End or resume the live Session before switching context.")).toBeTruthy();
  });
});
