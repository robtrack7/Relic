import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import "../../app/globals.css";
import { WorkspaceNavigation, type WorkspaceDestination } from "./workspace-navigation";

const meta = { title: "Workspace/Navigation", component: WorkspaceNavigation,
  parameters: { layout: "fullscreen", a11y: { test: "error" } } } satisfies Meta<typeof WorkspaceNavigation>;
export default meta;
type Story = StoryObj;
function NavigationStudy() {
  const [active, setActive] = useState<WorkspaceDestination>("prepare");
  return <div style={{ display: "flex", alignItems: "center", gap: 40, padding: 40, minHeight: "100dvh", background: "var(--paper)" }}>
    <WorkspaceNavigation active={active} onNavigate={setActive} />
    <p role="status">{active.charAt(0).toUpperCase() + active.slice(1)} selected</p>
  </div>;
}
export const WorkingContexts: Story = { render: () => <NavigationStudy />, play: async ({ canvasElement }) => {
  const scene = within(canvasElement);
  const prepare = scene.getByRole("button", { name: "Prepare" });
  prepare.focus();
  await userEvent.keyboard("{ArrowDown}{Enter}");
  await expect(scene.getByRole("button", { name: "Boards" })).toHaveAttribute("aria-current", "true");
  await userEvent.keyboard("{End}{Enter}");
  await expect(scene.getByRole("button", { name: "Sessions" })).toHaveAttribute("aria-current", "true");
} };

