import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import "../../app/globals.css";
import { BLACKWATER_DESK } from "@/components/canvas/desk-reference";
import { CanvasWorkspace } from "./canvas-workspace";

const meta = {
  title: "Desk/Canvas",
  component: CanvasWorkspace,
  parameters: { layout: "fullscreen", backgrounds: { disable: true }, a11y: { test: "error" } },
  args: { height: "100dvh", contextLabel: "Blackwater", contextMode: "Desk" }
} satisfies Meta<typeof CanvasWorkspace>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PopulatedDesk: Story = {
  args: { initialPlacements: BLACKWATER_DESK },
  play: async ({ canvasElement }) => {
    const scene = within(canvasElement);
    const mara = scene.getByRole("button", { name: /^character: Mara Vey\./ });
    mara.focus();
    await userEvent.keyboard("{Enter}");
    await expect(mara).toHaveAttribute("aria-pressed", "true");
    await expect(scene.getByRole("button", { name: "Fit selection" })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await expect(mara).toHaveAttribute("aria-pressed", "false");
  }
};

export const EmptyDesk: Story = {
  args: { initialPlacements: [] },
  play: async ({ canvasElement }) => {
    const scene = within(canvasElement);
    await expect(scene.getByRole("heading", { name: "Space for a world." })).toBeVisible();
    await userEvent.click(scene.getByRole("button", { name: "Zoom in" }));
    await userEvent.click(scene.getByRole("button", { name: "Fit Board" }));
    await expect(scene.getByRole("button", { name: /^Reset zoom to 100%/ })).toHaveTextContent("100%");
  }
};
