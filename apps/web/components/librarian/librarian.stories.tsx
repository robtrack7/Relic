import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { useMemo, useState } from "react";

import "../../app/globals.css";
import { Librarian } from "@/components/desk/librarian";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { LIBRARIAN_COMPOSITION, librarianFixtureRequest, type LibrarianFixtureState } from "./librarian.fixtures";

const followSource = fn();
const meta = {
  title: "Librarian/Conversation",
  parameters: { layout: "fullscreen", backgrounds: { disable: true }, a11y: { test: "error" } }
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function ConversationStudy({ state = "ready", narrow = false }: { state?: LibrarianFixtureState; narrow?: boolean }) {
  const request = useMemo(() => librarianFixtureRequest(state), [state]);
  const [open, setOpen] = useState(true);
  const [source, setSource] = useState("");
  return <div style={{ width: narrow ? "min(420px, 100%)" : "100%" }}>
    <WorkspaceShell height="100dvh" rightOpen={open} onRightOpenChange={setOpen} minCenterWidth={0}
      rightCarriage={{ id: "librarian", label: "Librarian", title: "Librarian", variant: "librarian", defaultWidth: narrow ? 320 : 380,
        render: carriage => <Librarian {...carriage} carriage={carriage} onOpenChange={setOpen} compositionId={LIBRARIAN_COMPOSITION} compositionName="Blackwater Board"
          focusCardId={null} focusLabel={null} selectedCardIds={[]} request={request} here={() => ({ x: 0, y: 0 })}
          onFollowSource={ref => { followSource(ref); setSource(ref.label); }} onActed={fn()} /> }}>
      <p style={{ margin: "100px 24px", maxWidth: 280, color: "var(--ink-quiet)", font: "13px/1.6 var(--font-ui)" }}>Storybook conversation fixture. Requests use authored responses and make no world changes.</p>
      {source ? <p role="status" style={{ margin: 24, fontFamily: "var(--font-ui)" }}>Source opened: {source}</p> : null}
    </WorkspaceShell>
  </div>;
}

export const GroundedConversation: Story = { render: () => <ConversationStudy />,
  play: async ({ canvasElement }) => {
    const scene = within(canvasElement);
    const citation = await scene.findByRole("button", { name: "Open citation 1: Tide ledger · folio 9" });
    await userEvent.click(citation);
    await expect(scene.getByText("Source opened: Tide ledger · folio 9")).toBeVisible();
  }
};
export const EmptyConversation: Story = { render: () => <ConversationStudy state="empty" /> };
export const ScrollableHistory: Story = { render: () => <ConversationStudy state="overflow" /> };
export const Unavailable: Story = { render: () => <ConversationStudy state="unavailable" /> };
export const NarrowCarriage: Story = { render: () => <ConversationStudy narrow /> };
export const SubmitAndKeepDraft: Story = { render: () => <ConversationStudy />,
  play: async ({ canvasElement }) => {
    const scene = within(canvasElement);
    await scene.findByText("Ready to send");
    const input = scene.getByRole("textbox", { name: "Ask the Librarian" });
    await userEvent.type(input, "Read the tide ledger.");
    await userEvent.keyboard("{Enter}");
    await userEvent.type(input, "Keep this next question");
    await scene.findByText("Ready to send");
    await userEvent.click(scene.getByRole("button", { name: "Collapse Librarian carriage" }));
    await userEvent.click(scene.getByRole("button", { name: "Open Librarian carriage" }));
    await expect(scene.getByRole("textbox", { name: "Ask the Librarian" })).toHaveValue("Keep this next question");
  }
};
export const InterruptedRequest: Story = { render: () => <ConversationStudy state="interrupted" />,
  play: async ({ canvasElement }) => {
    const scene = within(canvasElement);
    await scene.findByText("Ready to send");
    await userEvent.type(scene.getByRole("textbox", { name: "Ask the Librarian" }), "What does the ledger record?");
    await userEvent.click(scene.getByRole("button", { name: "Send message" }));
    await expect(await scene.findByRole("alert")).toHaveTextContent("connection was interrupted");
    await expect(scene.getByRole("textbox", { name: "Ask the Librarian" })).toHaveValue("What does the ledger record?");
    await expect(scene.getByRole("button", { name: "Send message" })).toBeEnabled();
  }
};
