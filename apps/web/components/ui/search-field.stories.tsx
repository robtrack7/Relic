import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { useId, useState } from "react";

import { SearchField } from "./search-field";

const meta = {
  title: "UI/Search Field",
  component: SearchField,
  parameters: { layout: "centered", a11y: { test: "error" } }
} satisfies Meta<typeof SearchField>;

export default meta;
type Story = StoryObj<typeof meta>;

const BASE_ARGS = { value: "", onChange: () => {}, open: false, onOpenChange: () => {} };

const FIXTURES = [
  { id: "mara", name: "Mara Vey", kind: "character", detail: "Keeps a ledger of promises." },
  { id: "bell", name: "The Drowned Bell", kind: "place", detail: "Its bronze crown breaks black water." }
] as const;

function SearchFixture({ state, initialValue = "" }: { state: "results" | "empty" | "loading" | "error"; initialValue?: string }) {
  const [open, setOpen] = useState(true);
  const [value, setValue] = useState(initialValue);
  const [active, setActive] = useState(0);
  const listboxId = useId();
  const panelId = useId();

  return (
    <div style={{ width: 420 }}>
      <SearchField
        value={value}
        onChange={setValue}
        open={open}
        onOpenChange={setOpen}
        onClear={() => setValue("")}
        panelId={panelId}
        listboxId={listboxId}
        activeDescendant={state === "results" ? `${listboxId}-${(FIXTURES[active] ?? FIXTURES[0]).id}` : undefined}
        busy={state === "loading"}
        placeholder="A name, or something you wrote"
        onFieldKeyDown={(event) => {
          if (event.key === "ArrowDown" && state === "results") {
            event.preventDefault();
            setActive((current) => Math.min(current + 1, FIXTURES.length - 1));
          }
        }}
      >
        {state === "loading" ? <p style={{ margin: "10px 8px", color: "var(--ink-quiet)" }} role="status">Searching…</p> : null}
        {state === "error" ? <p style={{ margin: "10px 8px", color: "var(--destructive)" }} role="alert">Search could not load. Try again.</p> : null}
        {state === "empty" ? <p style={{ margin: "10px 8px", color: "var(--ink-quiet)" }} role="status">Nothing matches “moon”.</p> : null}
        <ul id={listboxId} role="listbox" aria-label="Search results" style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {state === "results" ? FIXTURES.map((item, index) => (
            <li key={item.id} role="presentation">
              <button
                id={`${listboxId}-${item.id}`}
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseEnter={() => setActive(index)}
                style={{ display: "flex", width: "100%", justifyContent: "space-between", padding: "8px", border: 0, background: "transparent", textAlign: "left" }}
              >
                <span><strong>{item.name}</strong><br /><small>{item.detail}</small></span>
                <small>{item.kind}</small>
              </button>
            </li>
          )) : null}
        </ul>
      </SearchField>
    </div>
  );
}

export const Empty: Story = { args: BASE_ARGS, render: () => <SearchFixture state="empty" /> };

export const OpenResults: Story = {
  args: BASE_ARGS,
  render: () => <SearchFixture state="results" initialValue="mara" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole("combobox", { name: "Search this world" });
    await expect(input).toHaveValue("mara");
    await userEvent.click(canvas.getByRole("button", { name: "Clear search" }));
    await expect(input).toHaveValue("");
    await userEvent.click(input);
    await userEvent.keyboard("{ArrowDown}");
    await expect(canvas.getByRole("option", { name: /The Drowned Bell/ })).toHaveAttribute("aria-selected", "true");
  }
};

export const Loading: Story = { args: BASE_ARGS, render: () => <SearchFixture state="loading" initialValue="harbour" /> };
export const Error: Story = { args: BASE_ARGS, render: () => <SearchFixture state="error" initialValue="harbour" /> };

