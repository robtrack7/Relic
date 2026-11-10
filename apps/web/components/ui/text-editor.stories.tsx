import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { useState } from "react";

import "../../app/globals.css";
import { InlineEditableText, WritingEditor } from "./text-editor";

const meta = {
  title: "UI/Text editor",
  parameters: {
    layout: "padded",
    a11y: { test: "error" }
  }
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const InlineCommitAndCancel: Story = {
  render: () => {
    const [value, setValue] = useState("The west stair is still warm");
    const [editing, setEditing] = useState(false);
    return (
      <div style={{ maxWidth: 440 }}>
        <InlineEditableText
          value={value}
          editing={editing}
          onEditingChange={setEditing}
          onCommit={setValue}
          onCancel={() => setEditing(false)}
          placeholder="Name this note"
          ariaLabel="West stair note"
        />
        <p style={{ color: "var(--ink-quiet)", fontSize: 12 }}>
          Click the note, change the draft, then use Done, Cancel, Enter or Escape.
        </p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /West stair note: The west stair is still warm/ }));
    const editor = canvas.getByRole("textbox", { name: "West stair note" });
    await userEvent.clear(editor);
    await userEvent.type(editor, "The stair remembers");
    await userEvent.click(canvas.getByRole("button", { name: "Done" }));
    expect(canvas.getByText("The stair remembers")).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: /West stair note: The stair remembers/ }));
    await userEvent.type(canvas.getByRole("textbox", { name: "West stair note" }), " and waits");
    await userEvent.click(canvas.getByRole("button", { name: "Cancel" }));
    expect(canvas.getByText("The stair remembers")).toBeVisible();
  }
};

export const WritingShortcuts: Story = {
  render: () => {
    const [value, setValue] = useState("A plain-text field keeps the world legible.");
    const [lastAction, setLastAction] = useState("Editing");
    const [canvasKeys, setCanvasKeys] = useState(0);
    return (
      <div style={{ maxWidth: 560 }} onKeyDown={() => setCanvasKeys((count) => count + 1)}>
        <WritingEditor
          value={value}
          onCommit={(next) => {
            setValue(next);
            setLastAction("Committed");
          }}
          onCancel={() => setLastAction("Cancelled; original restored")}
          label="Session note"
          helpText="Plain text only. New lines are preserved; formatting stays out of the world model."
          placeholder="Capture what the table just learned"
        />
        <p style={{ color: "var(--ink-quiet)", fontSize: 12 }} aria-live="polite">
          {lastAction}: {value}
        </p>
        <p style={{ color: "var(--ink-quiet)", fontSize: 12 }}>Canvas key events: {canvasKeys}</p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = canvas.getByRole("textbox", { name: "Session note" });
    await userEvent.click(editor);
    await userEvent.keyboard("{Control>}{Enter}{/Control}");
    expect(canvas.getByText(/Committed:/)).toBeVisible();
    expect(canvas.getByText("Canvas key events: 0")).toBeVisible();

    await userEvent.type(editor, "unsaved");
    await userEvent.keyboard("{Escape}");
    expect((editor as HTMLTextAreaElement).value).toBe("A plain-text field keeps the world legible.");
  }
};

export const FieldHelpAndError: Story = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <div style={{ maxWidth: 560 }}>
        <WritingEditor
          value={value}
          onCommit={setValue}
          label="What should the Librarian remember?"
          helpText="Keep this to the observation itself; decide its classification later."
          error={value.length === 0 ? "A note is needed before this can be saved." : undefined}
          placeholder="The lantern went out before the bell"
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = canvas.getByRole("textbox", { name: "What should the Librarian remember?" });
    expect(editor).toHaveAttribute("aria-invalid", "true");
    expect(editor.getAttribute("aria-describedby")).toMatch(/help/);
    expect(editor.getAttribute("aria-describedby")).toMatch(/error/);
    expect(canvas.getByRole("alert")).toHaveTextContent("A note is needed");
  }
};

export const PlainTextLists: Story = {
  render: () => {
    const [value, setValue] = useState("The bell is warm\nThe rope is wet");
    return (
      <div style={{ maxWidth: 560 }}>
        <WritingEditor
          value={value}
          onCommit={setValue}
          label="Clues"
          helpText="List actions add literal text prefixes; the world remains plain text."
          placeholder="Capture one clue per line"
        />
        <p style={{ color: "var(--ink-quiet)", fontSize: 12 }}>{value}</p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = canvas.getByRole("textbox", { name: "Clues" }) as HTMLTextAreaElement;
    editor.setSelectionRange(0, editor.value.length);
    await userEvent.click(canvas.getByRole("button", { name: "Bulleted list" }));
    expect(editor.value).toBe("• The bell is warm\n• The rope is wet");
    await userEvent.click(canvas.getByRole("button", { name: "Numbered list" }));
    expect(editor.value).toBe("1. The bell is warm\n2. The rope is wet");
  }
};
