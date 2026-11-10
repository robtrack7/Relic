import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { CanvasWorkspace } from "@/components/workspace/canvas-workspace";

import "../../app/globals.css";

import type { ProxyPlacement } from "./canvas-foundation";
import {
  CanvasToolCluster,
  CanvasGlyph,
  CanvasViewControls,
  ContextualMinimap,
  type CanvasTool,
  type MinimapMode,
  type PersistentCanvasTool
} from "./canvas-controls";
import storyStyles from "./canvas-controls.stories.module.css";

const BOARD: readonly ProxyPlacement[] = [
  { id: "mara", kind: "character", title: "Mara Vey", note: "", x: -900, y: -420, width: 248, height: 176 },
  { id: "bell", kind: "place", title: "The Drowned Bell", note: "", x: -120, y: -680, width: 294, height: 208 },
  { id: "knocks", kind: "thread", title: "Three knocks beneath the quay", note: "", x: 760, y: -160, width: 268, height: 184 },
  { id: "ledger", kind: "source", title: "Tide ledger, folio 9", note: "", x: -520, y: 540, width: 276, height: 196 }
];

const meta = {
  title: "Canvas/Chrome & Controls",
  parameters: {
    layout: "fullscreen",
    backgrounds: { disable: true }
  }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ViewIcons: Story = {
  render: () => <div style={{ display: "flex", gap: 32, padding: 32, fontFamily: "var(--font-ui)" }}>
    <div><CanvasGlyph name="stack" /><p>Switch to Stack</p></div>
    <div><CanvasGlyph name="canvas" /><p>Switch to Desk</p></div>
  </div>
};

export const ToolRailStates: Story = {
  render: () => <ToolRailHarness />
};

export const ViewControlStates: Story = {
  render: () => <ViewControlHarness />
};

export const MinimapOverview: Story = {
  render: () => <MinimapHarness />
};

export const CreationMenus: Story = {
  render: () => <CanvasWorkspace initialPlacements={BOARD} contextLabel="The Drowned Coast" availableToolActions={["Fragment", "Character", "Place", "Faction", "Thread", "Note", "Source"]} onToolAction={() => {}} />,
  play: async ({ canvasElement }) => {
    const scene = within(canvasElement.ownerDocument.body);
    const create = scene.getByRole("button", { name: "Create" });
    await userEvent.click(create);
    await expect(scene.getByRole("menuitem", { name: "Fragment" })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(scene.getByRole("menuitem", { name: "Character" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect(create).toHaveFocus();
    await userEvent.click(scene.getByRole("button", { name: "Compose" }));
    await expect(scene.getByRole("menu", { name: "Compose menu" })).toHaveTextContent("Board composition");
    await userEvent.keyboard("{Escape}");
  }
};

function ToolRailHarness() {
  const [active, setActive] = useState<PersistentCanvasTool>("select");
  const [menu, setMenu] = useState<"select" | "create" | "compose" | null>(null);
  const press = (tool: CanvasTool) => {
    if (tool === "select" || tool === "create" || tool === "compose") {
      setMenu((current) => (current === tool ? null : tool));
      return;
    }
    setMenu(null);
    setActive(tool);
  };

  return (
    <div className={storyStyles.stage}>
      <div className={storyStyles.row}>
        <div className={storyStyles.specimen}>
          <span>Interactive state</span>
          <CanvasToolCluster activeTool={active} openMenu={menu} onToolPress={press} />
          <output className={storyStyles.readout}>{menu ? `${menu} menu open` : `${active} active`}</output>
        </div>
        <div className={storyStyles.specimen}>
          <span>Stage-shifted / Connect</span>
          <CanvasToolCluster activeTool="connect" openMenu={null} onToolPress={() => {}} />
        </div>
        <div className={storyStyles.specimen}>
          <span>Hand active</span>
          <CanvasToolCluster activeTool="hand" openMenu={null} onToolPress={() => {}} />
        </div>
      </div>
    </div>
  );
}

function ViewControlHarness() {
  const [scale, setScale] = useState(0.8);
  const [selected, setSelected] = useState(true);
  const [mode, setMode] = useState<MinimapMode>("auto");
  return (
    <div className={storyStyles.stage}>
      <div className={storyStyles.viewPad}>
        <CanvasViewControls
          scale={scale}
          hasSelection={selected}
          minimapMode={mode}
          onZoomOut={() => setScale((value) => Math.max(0.1, value / 1.2))}
          onResetZoom={() => setScale(1)}
          onZoomIn={() => setScale((value) => Math.min(4, value * 1.2))}
          onFitBoard={() => setScale(0.62)}
          onFitSelection={() => setScale(1.15)}
          onMinimapModeChange={setMode}
        />
      </div>
      <button type="button" onClick={() => setSelected((value) => !value)}>
        {selected ? "Hide" : "Show"} selection state
      </button>
    </div>
  );
}

function MinimapHarness() {
  const [center, setCenter] = useState({ x: 0, y: 0 });
  const viewport = { x: 320 - center.x * 0.34, y: 210 - center.y * 0.34, scale: 0.34 };
  return (
    <div className={storyStyles.stage}>
      <div className={storyStyles.minimapPad}>
        <ContextualMinimap
          placements={BOARD}
          viewport={viewport}
          viewportSize={{ width: 640, height: 420 }}
          selectedIds={["knocks"]}
          mode="always"
          onNavigate={setCenter}
        />
      </div>
      <output className={storyStyles.readout}>Camera center · {Math.round(center.x)}, {Math.round(center.y)}</output>
    </div>
  );
}
