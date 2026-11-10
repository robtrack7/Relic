import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import "../../app/globals.css";

import { Button, ButtonGroup, IconButton, SegmentedControl, ToggleButton } from "./control";
import styles from "./control.stories.module.css";

const meta = {
  title: "UI/Control",
  component: Button,
  parameters: { layout: "centered", a11y: { test: "error" } }
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Grammar: Story = {
  render: () => (
    <div className={styles.stage}>
      <ButtonGroup label="Button variants">
        <Button variant="quiet">Quiet</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="primary">Primary</Button>
        <Button variant="destructive">Delete</Button>
      </ButtonGroup>
      <ButtonGroup label="Icon controls">
        <IconButton label="Open menu">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17">
            <circle cx="5" cy="12" r="1.5" fill="currentColor" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            <circle cx="19" cy="12" r="1.5" fill="currentColor" />
          </svg>
        </IconButton>
        <IconButton label="Disabled action" disabled>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </IconButton>
        <Button density="compact">Compact</Button>
      </ButtonGroup>
    </div>
  )
};

export const States: Story = {
  render: () => (
    <div className={styles.stage}>
      <Button variant="primary">Hover or focus me</Button>
      <Button variant="secondary" disabled>Unavailable</Button>
      <Button variant="quiet" loading>Loading</Button>
      <IconButton label="Loading icon" loading>
        <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
      </IconButton>
    </div>
  )
};

export const StatefulControls: Story = {
  render: () => (
    <div className={styles.stage}>
      <ToggleButton defaultPressed aria-label="Show sources">Sources</ToggleButton>
      <SegmentedControl
        aria-label="Desk arrangement"
        options={[
          { value: "canvas", label: "Canvas" },
          { value: "stack", label: "Stack" },
          { value: "timeline", label: "Timeline", disabled: true }
        ]}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const sources = canvas.getByRole("button", { name: "Show sources" });
    await expect(sources).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(sources);
    await expect(sources).toHaveAttribute("aria-pressed", "false");

    const segmented = canvas.getByRole("radiogroup", { name: "Desk arrangement" });
    const canvasOption = within(segmented).getByRole("radio", { name: "Canvas" });
    await userEvent.click(within(segmented).getByRole("radio", { name: "Stack" }));
    await expect(canvasOption).toHaveAttribute("tabindex", "-1");
    await userEvent.keyboard("{ArrowLeft}");
    await expect(canvasOption).toHaveAttribute("aria-checked", "true");
  }
};

export const IconTooltip: Story = {
  render: () => (
    <div className={styles.stage}>
      <IconButton label="Open Librarian" title="Open the Librarian carriage">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17">
          <path d="M5 6.5h14M5 12h14M5 17.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </IconButton>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Open Librarian" });
    await userEvent.hover(button);
    await expect(await within(document.body).findByRole("tooltip")).toHaveTextContent("Open the Librarian carriage");
    await userEvent.keyboard("{Escape}");
    await expect(within(document.body).queryByRole("tooltip")).not.toBeInTheDocument();
  }
};

export const TopRightTooltip: Story = {
  render: () => (
    <div style={{ display: "flex", justifyContent: "flex-end", width: "min(520px, 100vw - 32px)", padding: 16, background: "var(--paper)" }}>
      <IconButton label="Open Librarian" title="Open the Librarian carriage" tooltipPlacement="left">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="7" />
          <path d="m12 1 2 9 9 2-9 2-2 9-2-9-9-2 9-2 2-9Z" />
        </svg>
      </IconButton>
    </div>
  )
};
