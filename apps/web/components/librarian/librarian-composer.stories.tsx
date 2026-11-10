import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { useState } from "react";

import "../../app/globals.css";

import { LibrarianComposer, type LibrarianComposerStatus } from "./librarian-composer";

const meta = {
  title: "Librarian/Composer",
  parameters: {
    layout: "centered",
    backgrounds: { disable: true },
    a11y: { test: "error" }
  },
  decorators: [(Story) => <div style={{ width: "min(420px, calc(100vw - 32px))", padding: 20, background: "var(--carriage-surface)" }}><Story /></div>]
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Fixture({ initial = "", status = "idle", scope = "Blackwater Board · The Drowned Bell" }: { initial?: string; status?: LibrarianComposerStatus; scope?: string }) {
  const [value, setValue] = useState(initial);
  const [sent, setSent] = useState("");
  return (
    <div>
      <LibrarianComposer value={value} onChange={setValue} status={status} scope={scope} onSubmit={() => { setSent(value); setValue(""); }} />
      {sent ? <p style={{ margin: "12px 0 0", color: "var(--ink-quiet)", font: "12px var(--font-ui)" }}>Sent: {sent}</p> : null}
    </div>
  );
}

export const Idle: Story = { render: () => <Fixture /> };
export const LongDraft: Story = {
  render: () => <Fixture initial="What connects the missing crews to the western quay, and which parts of that account remain uncertain?" />
};
export const Opening: Story = { render: () => <Fixture status="opening" /> };
export const Submitting: Story = { render: () => <Fixture status="submitting" initial="Trace the bell ledger." /> };
export const Unavailable: Story = { render: () => <Fixture status="unavailable" initial="Keep this draft while the Librarian reconnects." /> };
export const Narrow: Story = {
  render: () => <div style={{ width: 260 }}><Fixture scope="Stage · Mara selected" /></div>
};
export const KeyboardSend: Story = {
  render: () => <Fixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "Ask the Librarian" });
    await userEvent.type(input, "What changed at the quay?");
    await userEvent.keyboard("{Enter}");
    await expect(canvas.getByText("Sent: What changed at the quay?")).toBeVisible();
  }
};
export const ShiftEnterKeepsLine: Story = {
  render: () => <Fixture />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("textbox", { name: "Ask the Librarian" });
    await userEvent.type(input, "A question");
    await userEvent.keyboard("{Shift>}{Enter}{/Shift}");
    await userEvent.type(input, "with a second line");
    await expect(input).toHaveValue("A question\nwith a second line");
  }
};
