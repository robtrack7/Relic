import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within, waitFor } from "storybook/test";

import { DeskSurface } from "./desk-surface";
import { OBJECT_DESK, OBJECT_WORKSPACE } from "@/components/world-objects/object-fixtures";
import { mockWorldOperations } from "@/components/world-objects/object-workspace.stories";
import "../../app/globals.css";

const collected = {
  ...OBJECT_DESK,
  spatial: {
    version: 1,
    collections: [{
      id: "research-desk",
      title: "Research collection",
      cardIds: OBJECT_DESK.cards.slice(0, 3).map(card => card.cardId),
      collapsed: false
    }]
  }
};

const stacked = {
  ...collected,
  spatial: {
    ...collected.spatial,
    collections: [{ ...collected.spatial.collections[0]!, collapsed: true }]
  }
};

const meta = {
  title: "Desk/Interactive Desk",
  component: DeskSurface,
  parameters: {
    layout: "fullscreen",
    a11y: { test: "error" },
    nextjs: { appDirectory: true }
  },
  args: { initial: OBJECT_DESK, workspace: OBJECT_WORKSPACE },
  beforeEach: ({ args }) => mockWorldOperations(args.initial)
} satisfies Meta<typeof DeskSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InteractiveDesk: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const mara = canvas.getByRole("article", { name: "character: Mara Veyra" });
    await userEvent.click(mara);
    await expect(mara).toHaveAttribute("data-selected", "true");
    await userEvent.click(within(mara).getByRole("button", { name: "Expand card" }));
    await expect(mara).toHaveAttribute("data-disclosure", "expanded");
    // An expanded selection carries its actions in the tray attached beneath it.
    const tray = canvas.getByRole("toolbar", { name: "Selection actions" });
    await expect(tray).toHaveAttribute("data-placement", "tray");
    await userEvent.click(within(tray).getByRole("button", { name: "Collapse card" }));
    await expect(mara).toHaveAttribute("data-disclosure", "card");
  }
};

export const CollectedDesk: Story = {
  args: { initial: collected },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const collection = canvas.getByRole("region", { name: "Collection: Research collection" });
    const original = [...collected.cards.slice(0, 3)].map(card => `translate(${card.layout.x}px, ${card.layout.y}px) rotate(0deg)`);
    await userEvent.click(canvas.getByRole("button", { name: "Stack Research collection" }));
    await expect(collection).toHaveAttribute("data-collapsed", "true");
    await userEvent.click(canvas.getByRole("button", { name: "Expand Research collection" }));
    await expect(collection).not.toHaveAttribute("data-collapsed");
    const positions = [...canvasElement.querySelectorAll<HTMLElement>("[data-card-id]")]
      .filter(card => collected.spatial.collections[0]!.cardIds.includes(card.dataset.cardId as typeof collected.cards[number]["cardId"]))
      .map(card => `${card.style.transform.includes("translate") ? card.style.transform : ""}`);
    expect(positions).toEqual(original);
  }
};

export const RapidTransitions: Story = {
  args: { initial: stacked },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const collection = canvas.getByRole("region", { name: "Collection: Research collection" });
    const toggle = canvas.getByRole("button", { name: "Expand Research collection" });
    await userEvent.click(toggle);
    await userEvent.click(canvas.getByRole("button", { name: "Stack Research collection" }));
    await userEvent.click(canvas.getByRole("button", { name: "Expand Research collection" }));
    await expect(collection).not.toHaveAttribute("data-collapsed");
  }
};

/** Reproduces the manual test's detached anchor after moving/regrouping members. */
export const RegroupedCollection: Story = {
  args: { initial: {
    ...collected, cards: collected.cards.slice(0, 3),
    spatial: { version: 40, collections: [{ ...collected.spatial.collections[0]!, anchor: { x: -1800, y: -750 } }] }
  } },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const surface = canvas.getByRole("application", { name: "Desk canvas" });
    const world = [...surface.querySelectorAll<HTMLElement>("[style]")].find(element => element.style.transform.includes("scale("))!;
    const camera = world.style.transform;
    const authored = args.initial.cards.map(card => `translate(${card.layout.x}px, ${card.layout.y}px) rotate(0deg)`);
    for (let cycle = 0; cycle < 3; cycle++) {
      await userEvent.click(canvas.getByRole("button", { name: "Stack Research collection" }));
      await waitFor(() => {
        const collection = canvas.getByRole("region", { name: "Collection: Research collection" });
        expect(Number.parseFloat(collection.style.left)).toBe(Math.min(...args.initial.cards.map(card => card.layout.x)) - 26);
        const rect = collection.getBoundingClientRect();
        expect(rect.left).toBeGreaterThanOrEqual(0);
        expect(rect.top).toBeGreaterThanOrEqual(0);
      });
      expect(world.style.transform).toBe(camera);
      await userEvent.click(canvas.getByRole("button", { name: "Expand Research collection" }));
      expect([...surface.querySelectorAll<HTMLElement>("[data-card-id]")].map(card => card.style.transform)).toEqual(authored);
      expect(world.style.transform).toBe(camera);
    }
  }
};

export const ReducedMotion: Story = {
  parameters: { viewport: { defaultViewport: "responsive" }, chromatic: { disableSnapshot: true } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole("article", { name: "character: Mara Veyra" });
    await userEvent.click(card);
    await userEvent.keyboard("{Escape}");
    await expect(card).not.toHaveAttribute("data-selected", "true");
  }
};

export const ContextualDeskInteractions: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByRole("article", { name: "character: Mara Veyra" });
    await userEvent.pointer([{ target: card, keys: "[MouseRight]" }]);
    await waitFor(() => expect(within(document.body).getByRole("menu", { name: /card actions/i })).toBeVisible());
    await userEvent.keyboard("{Escape}");
    await expect(within(document.body).queryByRole("menu", { name: /card actions/i })).toBeNull();
    await userEvent.click(card);
    await userEvent.keyboard("{Shift>}{F10}{/Shift}");
    await waitFor(() => expect(within(document.body).getByRole("menu", { name: /card actions/i })).toBeVisible());
    await userEvent.keyboard("{Escape}");
  }
};

