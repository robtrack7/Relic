import { useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { CanvasGlyph } from "@/components/canvas/canvas-controls";
import { IconButton } from "./control";
import { FloatingSurface } from "./floating-surface";

const meta = { title: "UI/Floating surface", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function MenuStudy() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return <div style={{ minHeight: "100dvh", background: "var(--paper)", padding: 24 }}>
    <p style={{ color: "var(--ink-quiet)", fontFamily: "var(--font-ui)" }}>Board actions stay within the visible workspace.</p>
    <div style={{ position: "absolute", bottom: 24, right: 24 }}>
      <IconButton label="Board actions" ref={trigger} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(value => !value)}><CanvasGlyph name="more" /></IconButton>
    </div>
    <FloatingSurface open={open} triggerRef={trigger} label="Board actions" onClose={restore => { setOpen(false); if (restore) trigger.current?.focus(); }}>
      <span>The Drowned Coast</span>
      <button type="button" role="menuitem" onClick={() => setOpen(false)}>Fit content</button>
      <button type="button" role="menuitem" aria-disabled="true">Rename Board</button>
      <button type="button" role="menuitem" onClick={() => setOpen(false)}>Return to Desk</button>
    </FloatingSurface>
  </div>;
}

function SideRailStudy({ startAligned = false }: { startAligned?: boolean }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return <div style={{ minHeight: "100dvh", position: "relative", background: "var(--paper)", padding: 24 }}>
    <div style={{ position: "absolute", top: startAligned ? 158 : 24, bottom: 24, left: 24, width: 48, display: "grid", alignContent: startAligned ? "start" : "center" }}>
      <IconButton label="Open destination rail" ref={trigger} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(value => !value)}><CanvasGlyph name="chevron" /></IconButton>
    </div>
    <p style={{ marginLeft: 72, color: "var(--ink-quiet)", fontFamily: "var(--font-ui)" }}>Rail destinations keep their menu beside the trigger.</p>
    <FloatingSurface open={open} triggerRef={trigger} label="Destinations" role="dialog" placement="right" align={startAligned ? "start" : "center"} width={300}
      onClose={restore => { setOpen(false); if (restore) trigger.current?.focus(); }}>
      <span>Destinations</span>
      <button type="button" onClick={() => setOpen(false)}>Boards</button>
      <button type="button" onClick={() => setOpen(false)}>Sessions</button>
    </FloatingSurface>
  </div>;
}

export const KeyboardAndEdgePlacement: Story = {
  render: () => <MenuStudy />,
  play: async ({ canvasElement }) => {
    const scene = within(canvasElement.ownerDocument.body);
    const trigger = scene.getByRole("button", { name: "Board actions" });
    await userEvent.click(trigger);
    await expect(scene.getByRole("menuitem", { name: "Fit content" })).toHaveFocus();
    await userEvent.keyboard("{End}");
    await expect(scene.getByRole("menuitem", { name: "Return to Desk" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect(trigger).toHaveFocus();
    await expect(scene.queryByRole("menu")).not.toBeInTheDocument();
  }
};

export const SideRailPlacement: Story = {
  render: () => <SideRailStudy />,
  play: async ({ canvasElement }) => {
    const scene = within(canvasElement.ownerDocument.body);
    await userEvent.click(scene.getByRole("button", { name: "Open destination rail" }));
    await expect(scene.getByRole("dialog", { name: "Destinations" })).toBeVisible();
  }
};

export const TopAlignedRailPlacement: Story = {
  render: () => <SideRailStudy startAligned />,
  play: async ({ canvasElement }) => {
    const scene = within(canvasElement.ownerDocument.body);
    const trigger = scene.getByRole("button", { name: "Open destination rail" });
    await userEvent.click(trigger);
    const panel = scene.getByRole("dialog", { name: "Destinations" });
    await expect(panel.getBoundingClientRect().top).toBeGreaterThanOrEqual(trigger.getBoundingClientRect().top);
    await userEvent.keyboard("{Escape}");
    await expect(trigger).toHaveFocus();
  }
};
