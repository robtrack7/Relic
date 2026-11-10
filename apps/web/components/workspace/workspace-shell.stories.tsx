import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { useState } from "react";
import "../../app/globals.css";
import { LIBRARIAN_CARRIAGE } from "@/components/carriage/carriage.fixtures";
import { WorkspaceShell } from "./workspace-shell";
import { DeskSurface } from "@/components/desk/desk-surface";
import { OBJECT_DESK, OBJECT_WORKSPACE } from "@/components/world-objects/object-fixtures";
import { mockWorldOperations } from "@/components/world-objects/object-workspace.stories";
import { asCompositionId, asSessionId, asWorldId, type Prep } from "@/lib/world/model";
import styles from "./workspace-shell.stories.module.css";

/**
 * How the shell composes the real Desk with its carriages at each width. Every
 * story is the product surface; play functions open carriages the way a GM does.
 */
const meta = {
  title: "Workspace/Geometry",
  parameters: { layout: "fullscreen", backgrounds: { disable: true }, a11y: { test: "error" }, nextjs: { appDirectory: true } },
  beforeEach: () => { mockWorldOperations(OBJECT_DESK); }
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
type Scene = ReturnType<typeof within>;

const PREP: Prep = {
  session: { id: asSessionId("story-session-9"), worldId: asWorldId("blackwater"), compositionId: asCompositionId("story-prep-9"), title: "The Drowned Bell", intent: "Find the missing crews", state: "planned", version: 1, createdAt: "2026-11-04T18:00:00Z" },
  beats: []
};

/** Each scenario states its own desk width, so a composition never depends on the window it is viewed in. */
function Desk({ prep, width = "desktop" }: { prep?: Prep; width?: "desktop" | "constrained" | "narrow" }) {
  return <div className={styles[width]}><DeskSurface workspace={OBJECT_WORKSPACE} initial={OBJECT_DESK} prep={prep ?? null} /></div>;
}

/** Press a carriage control; opening one that is already open (Prepare starts open with a session) is a no-op. */
const open = async (scene: Scene, ...names: string[]) => {
  await scene.findByRole("application", { name: "Desk canvas" });
  for (const name of names) {
    const already = name.startsWith("Open ") && scene.queryByRole("button", { name: name.replace(/^Open /, "Collapse ") });
    if (!already) await userEvent.click(await scene.findByRole("button", { name }));
  }
};
/** The canvas camera: the transformed world plane inside the Desk canvas. */
const camera = (scene: Scene) => [...(scene.getByRole("application", { name: "Desk canvas" }) as HTMLElement).querySelectorAll("[style]")].map(node => node as HTMLElement)
  .find(node => node.style.transform.includes("scale("))?.style.transform;

export const Canvas: Story = { render: () => <Desk /> };

export const StableDesktop: Story = {
  render: () => <Desk />,
  play: async ({ canvasElement }) => {
    const scene = within(canvasElement);
    await scene.findByRole("application", { name: "Desk canvas" });
    const card = await scene.findByRole("article", { name: "character: Mara Veyra" });
    const workspace = scene.getByLabelText("Relic workspace");
    // Measured within the workspace: a 1440 desk in a narrower frame may scroll the page itself.
    const place = () => { const c = card.getBoundingClientRect(), w = workspace.getBoundingClientRect(); return { x: c.x - w.x, y: c.y - w.y }; };
    const before = { camera: camera(scene), card: place() };
    // Carriages overlay a stable Canvas: opening and closing them never moves the world.
    for (const name of ["Open Stage carriage", "Open Librarian carriage", "Collapse Stage carriage", "Collapse Librarian carriage"]) {
      await open(scene, name);
      await expect(camera(scene)).toBe(before.camera);
      await expect(place().x).toBeCloseTo(before.card.x, 3);
      await expect(place().y).toBeCloseTo(before.card.y, 3);
    }
  }
};

export const LeftCanvas: Story = { render: () => <Desk />, play: async ({ canvasElement }) => open(within(canvasElement), "Open Stage carriage") };
export const CanvasRight: Story = { render: () => <Desk />, play: async ({ canvasElement }) => open(within(canvasElement), "Open Librarian carriage") };
export const LeftCanvasRight: Story = {
  render: () => <Desk />,
  play: async ({ canvasElement }) => {
    const scene = within(canvasElement);
    await open(scene, "Open Stage carriage", "Open Librarian carriage");
    await expect(scene.getByRole("complementary", { name: "Stage carriage" })).toBeVisible();
    await waitFor(() => expect(scene.getByLabelText("Relic workspace")).toHaveAttribute("data-left-mode", "overlay"));
  }
};
export const PrepareWithLibrarian: Story = {
  render: () => <Desk prep={PREP} />,
  play: async ({ canvasElement }) => open(within(canvasElement), "Open Prepare carriage", "Open Librarian carriage")
};

export const ConstrainedSplit: Story = {
  render: () => <Desk width="constrained" />,
  play: async ({ canvasElement }) => {
    const scene = within(canvasElement);
    await open(scene, "Open Stage carriage", "Open Librarian carriage");
    const divider = await scene.findByRole("separator", { name: "Resize carriage workspace" });
    divider.focus();
    const before = Number(divider.getAttribute("aria-valuenow"));
    await userEvent.keyboard("{ArrowRight}");
    await expect(Number(divider.getAttribute("aria-valuenow"))).toBeGreaterThan(before);
    await userEvent.click(scene.getByRole("button", { name: "Collapse Librarian carriage" }));
    await expect(scene.findByRole("toolbar", { name: "Canvas tools" })).resolves.toBeVisible();
    await expect(scene.queryByRole("separator", { name: "Resize carriage workspace" })).toBeNull();
  }
};
export const ConstrainedPrepareSplit: Story = {
  render: () => <Desk prep={PREP} width="narrow" />,
  play: async ({ canvasElement }) => open(within(canvasElement), "Open Prepare carriage", "Open Librarian carriage")
};
export const ConstrainedLibrarian: Story = { render: () => <Desk width="narrow" />, play: async ({ canvasElement }) => open(within(canvasElement), "Open Librarian carriage") };
export const NarrowDesktop: Story = { render: () => <Desk prep={PREP} width="narrow" />, play: async ({ canvasElement }) => open(within(canvasElement), "Open Prepare carriage") };

function InterruptedStudy() {
  const [rightOpen, setRightOpen] = useState(false);
  return <div className={styles.desktop}>
    <button type="button" className={styles.reverse} onClick={() => setRightOpen(current => !current)}>Reverse Librarian transition</button>
    <WorkspaceShell height="100dvh" layoutWidth={1440} rightCarriage={LIBRARIAN_CARRIAGE} rightOpen={rightOpen} onRightOpenChange={setRightOpen}><div className={styles.paper}/></WorkspaceShell>
  </div>;
}
/** The shell's controlled contract: a parent may reverse a carriage mid-transition and it settles where it was sent. */
export const InterruptedWithdrawal: Story = {
  render: () => <InterruptedStudy />,
  play: async ({ canvasElement }) => {
    const scene = within(canvasElement);
    const reverse = scene.getByRole("button", { name: "Reverse Librarian transition" });
    await userEvent.click(reverse); await userEvent.click(reverse); await userEvent.click(reverse);
    await Promise.all(canvasElement.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})));
    await expect(scene.getByRole("button", { name: /Collapse Librarian carriage/ })).toBeVisible();
  }
};
