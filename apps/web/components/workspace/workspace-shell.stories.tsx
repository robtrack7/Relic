import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { useState } from "react";
import "../../app/globals.css";
import { BLACKWATER_DESK } from "@/components/canvas/desk-reference";
import { PREPARE_CARRIAGE, STAGE_CARRIAGE, LIBRARIAN_CARRIAGE } from "@/components/carriage/carriage.fixtures";
import { CanvasWorkspace } from "./canvas-workspace";
import { WorkspaceShell } from "./workspace-shell";
import { WorkspaceNavigation, type WorkspaceDestination } from "./workspace-navigation";
import styles from "./workspace-shell.stories.module.css";

const meta = { title: "Workspace/Geometry", parameters: { layout: "fullscreen", backgrounds: { disable: true }, a11y: { test: "error" } } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function WorkspaceStudy({ left = "stage", leftOpen = false, rightOpen = false, width }: { left?: "prepare" | "stage"; leftOpen?: boolean; rightOpen?: boolean; width?: number }) {
  const [destination, setDestination] = useState<WorkspaceDestination>();
  return <CanvasWorkspace leftCarriage={left === "prepare" ? PREPARE_CARRIAGE : STAGE_CARRIAGE} rightCarriage={LIBRARIAN_CARRIAGE}
    navigation={dock => <WorkspaceNavigation active={destination} onNavigate={next => { setDestination(next); if (next === "prepare") dock.toggleLeft(); }} />}
    defaultLeftOpen={leftOpen} defaultRightOpen={rightOpen} layoutWidth={width} contextLabel="Blackwater Board" contextMode={leftOpen ? left === "prepare" ? "Prepare" : "Stage" : "Desk"} initialPlacements={BLACKWATER_DESK} />;
}
export const Canvas: Story = { render: () => <WorkspaceStudy /> };
export const StableDesktop: Story = {
  render: () => <WorkspaceStudy width={1440} />,
  play: async ({ canvasElement }) => {
    const scene = within(canvasElement);
    await userEvent.click(scene.getByRole("button", { name: "Zoom in" }));
    const card = scene.getByRole("button", { name: /^character: Mara Vey\./ });
    const tools = scene.getByRole("toolbar", { name: "Canvas tools" });
    const search = scene.getByRole("button", { name: "Search Relic" });
    const camera = scene.getByTestId("canvas-world").getAttribute("style");
    const before = [card, tools, search].map(node => node.getBoundingClientRect());
    for (const name of ["Open Stage carriage", "Open Librarian carriage", "Collapse Stage carriage", "Collapse Librarian carriage"]) {
      await userEvent.click(scene.getByRole("button", { name }));
      await expect(scene.getByTestId("canvas-world").getAttribute("style")).toBe(camera);
      for (const [index, node] of [card, tools, search].entries()) {
        const after = node.getBoundingClientRect();
        await expect(after.x).toBeCloseTo(before[index]!.x, 3);
        await expect(after.y).toBeCloseTo(before[index]!.y, 3);
      }
    }
  }
};
export const LeftCanvas: Story = { render: () => <WorkspaceStudy leftOpen /> };
export const CanvasRight: Story = { render: () => <WorkspaceStudy rightOpen /> };
export const LeftCanvasRight: Story = {
  render: () => <WorkspaceStudy leftOpen rightOpen />,
  play: async ({ canvasElement }) => {
    const scene = within(canvasElement);
    const stage = scene.getByRole("complementary", { name: "Stage carriage" });
    await userEvent.click(within(stage).getByRole("button", { name: "Scene stack" }));
    await expect(within(stage).getByRole("button", { name: "Scene stack" })).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(scene.getByRole("button", { name: "Collapse Stage carriage" }));
    await userEvent.click(await scene.findByRole("button", { name: "Open Stage carriage" }));
    await expect(within(stage).getByRole("button", { name: "Scene stack" })).toHaveAttribute("aria-expanded", "true");
  }
};
export const PrepareWithLibrarian: Story = { render: () => <WorkspaceStudy left="prepare" leftOpen rightOpen /> };
export const ConstrainedSplit: Story = { render: () => <div className={styles.constrained}><WorkspaceStudy leftOpen rightOpen /></div>,
  play: async ({ canvasElement }) => {
    const scene = within(canvasElement);
    const divider = scene.getByRole("separator", { name: "Resize carriage workspace" });
    divider.focus();
    const before = Number(divider.getAttribute("aria-valuenow"));
    await userEvent.keyboard("{ArrowRight}");
    await expect(Number(divider.getAttribute("aria-valuenow"))).toBeGreaterThan(before);
    await userEvent.click(scene.getByRole("button", { name: "Collapse Librarian carriage" }));
    await expect(scene.findByRole("toolbar", { name: "Canvas tools" })).resolves.toBeVisible();
    await expect(scene.queryByRole("separator", { name: "Resize carriage workspace" })).toBeNull();
    await userEvent.click(await scene.findByRole("button", { name: "Open Librarian carriage" }));
    await expect(scene.getByRole("separator", { name: "Resize carriage workspace" })).toBeVisible();
  }
};
export const ConstrainedPrepareSplit: Story = { render: () => <div className={styles.narrow}><WorkspaceStudy left="prepare" leftOpen rightOpen /></div> };
export const ConstrainedLibrarian: Story = { render: () => <div className={styles.narrow}><WorkspaceStudy rightOpen /></div> };
export const NarrowDesktop: Story = { render: () => <div className={styles.narrow}><WorkspaceStudy left="prepare" leftOpen /></div> };

function FocusDockStudy({ width = 1440 }: { width?: number }) {
  const [focusOpen, setFocusOpen] = useState(true);
  const [librarianOpen, setLibrarianOpen] = useState(true);
  return <WorkspaceShell height="100dvh" layoutWidth={width} builderActive focusOpen={focusOpen} onFocusOpenChange={setFocusOpen}
    rightCarriage={LIBRARIAN_CARRIAGE} rightOpen={librarianOpen} onRightOpenChange={setLibrarianOpen}
    focusPanel={<aside aria-label="Focus panel" style={{ height: "100%", overflow: "auto", padding: 24, background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 14 }}><h2 style={{ marginTop: 0 }}>Mara Veyra</h2><p>Focus preview · Overview</p><button type="button" onClick={() => setFocusOpen(false)}>Close Focus</button></aside>}>
    <section style={{ height: "100%", padding: 40, background: "var(--paper)" }}><h1>Entity Builder</h1><p>Central authoring stays primary while Focus previews the same entity.</p></section>
  </WorkspaceShell>;
}

export const BuilderWithFocusAndLibrarian: Story = { render: () => <FocusDockStudy/> };
export const ConstrainedFocusPanelSwitch: Story = {
  render: () => <div className={styles.narrow}><FocusDockStudy width={760}/></div>,
  play: async ({ canvasElement }) => {
    const scene = within(canvasElement);
    const workspace = scene.getByLabelText("Relic workspace");
    await expect(workspace).toHaveAttribute("data-focus-mode", "shared");
    await expect(scene.getByRole("group", { name: "Right workspace panel" })).toBeVisible();
    await userEvent.click(scene.getByRole("button", { name: "Show Focus preview" }));
    await expect(workspace.querySelector('[data-focus-panel-region][data-focus-visible="true"]')).toBeTruthy();
  }
};

function InterruptedStudy() {
  const [rightOpen, setRightOpen] = useState(false);
  return <><button type="button" style={{ position: "fixed", top: 85, left: 180, zIndex: 150 }} onClick={() => setRightOpen(open => !open)}>Reverse Librarian transition</button>
    <CanvasWorkspace rightCarriage={LIBRARIAN_CARRIAGE} rightOpen={rightOpen} onRightOpenChange={setRightOpen} initialPlacements={BLACKWATER_DESK} layoutWidth={1440}/></>;
}
export const InterruptedWithdrawal: Story = { render: () => <InterruptedStudy/>, play: async ({ canvasElement }) => {
  const scene = within(canvasElement);
  const button = scene.getByRole("button", { name: "Reverse Librarian transition" });
  const camera = scene.getByTestId("canvas-world").getAttribute("style");
  await userEvent.click(button); await userEvent.click(button); await userEvent.click(button);
  await expect(scene.findByRole("button", { name: /Collapse Librarian carriage/ })).resolves.toBeInTheDocument();
  await Promise.all(canvasElement.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})));
  await expect(scene.getByRole("button", { name: /Collapse Librarian carriage/ })).toBeVisible();
  await expect(scene.getByTestId("canvas-world").getAttribute("style")).toBe(camera);
} };
