import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import "../../app/globals.css";

import { CanvasFoundation, type ProxyPlacement } from "./canvas-foundation";
import { BLACKWATER_DESK } from "./desk-reference";

const STRESS: readonly ProxyPlacement[] = Array.from({ length: 500 }, (_, index) => {
  const column = index % 25;
  const row = Math.floor(index / 25);
  return {
    id: `proxy-${String(index + 1).padStart(3, "0")}`,
    kind: index % 5 === 0 ? "thread" : index % 3 === 0 ? "place" : "fragment",
    title: `Blackwater record ${index + 1}`,
    note: "A lightweight proxy used to reveal frame drops, excessive mounting, and hit-test costs.",
    x: (column - 12) * 292 + (row % 2) * 36,
    y: (row - 10) * 212,
    width: 244 + (index % 3) * 16,
    height: 156 + (index % 4) * 12,
    tone: (["paper", "sage", "slate", "archive"] as const)[index % 4]
  };
});

const meta = {
  title: "Canvas/Foundation",
  component: CanvasFoundation,
  parameters: {
    layout: "fullscreen",
    backgrounds: { disable: true }
  },
  tags: ["autodocs"]
} satisfies Meta<typeof CanvasFoundation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WorkingLoop: Story = {
  args: {
    initialPlacements: BLACKWATER_DESK,
    height: "100vh"
  }
};

export const EmptyField: Story = {
  args: {
    initialPlacements: [],
    height: "100vh"
  }
};

export const HandMode: Story = {
  args: {
    initialPlacements: BLACKWATER_DESK.slice(0, 3),
    initialView: "origin",
    activeTool: "hand",
    height: "100vh"
  }
};

export const Stress500: Story = {
  args: {
    initialPlacements: STRESS,
    initialView: "origin",
    height: "100vh",
    diagnostics: true
  }
};
