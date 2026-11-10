import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRef, useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { LIBRARIAN_CARRIAGE } from "@/components/carriage/carriage.fixtures";
import { EntityBuilder, EntityFocus } from "@/components/entities/entity-surfaces";
import { useEntitySession } from "@/components/entities/entity-session";
import { ENTITY_FIXTURE_GROUPS, scopedEntityFixture } from "@/components/entities/entity-fixtures";
import { configureEntityStoryActions, type EntityStorySaveMode } from "@/components/entities/entity-story-harness";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import styles from "@/components/entities/entity-workspace.module.css";
import type { EntitySnapshot } from "@/lib/world/entity-document";
import "../../app/globals.css";

const character = scopedEntityFixture(ENTITY_FIXTURE_GROUPS.character[0]!, "focus-mode-character");
const thread = scopedEntityFixture(ENTITY_FIXTURE_GROUPS.thread[0]!, "focus-mode-thread");

const meta = {
  title: "Entities/Focus and Builder",
  parameters: { layout: "fullscreen", backgrounds: { disable: true }, a11y: { test: "todo" } },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

type FocusPage = "overview" | "mechanics" | "relationships" | "history" | "notes" | "sources" | "content";

function Scene({ initialEntity, initialBuilder = false, withLibrarian = false, mode = "ok", initialPage = "overview" }: { initialEntity: EntitySnapshot; initialBuilder?: boolean; withLibrarian?: boolean; mode?: EntityStorySaveMode; initialPage?: FocusPage }) {
  const fixture = initialEntity;
  const modeRef = useRef({ current: mode });
  const configured = useRef(false);
  if (!configured.current) { configureEntityStoryActions([fixture], modeRef.current); configured.current = true; }
  const [page, setPage] = useState<FocusPage>(initialPage);
  const [focusOpen, setFocusOpen] = useState(true);
  const [builderActive, setBuilderActive] = useState(initialBuilder);
  const { entity, session } = useEntitySession(String(fixture.worldId), String(fixture.objectId), fixture);
  if (!entity) return <main style={{ minHeight: "100dvh", padding: 40 }}>Opening the entity session…</main>;
  const focus = <EntityFocus entity={entity} session={session} page={page} onPageChange={setPage} onBuilder={() => setBuilderActive(true)} onClose={() => setFocusOpen(false)} onFollow={() => setFocusOpen(true)} builderEntityId={builderActive ? entity.objectId : null}/>;
  return <WorkspaceShell ariaLabel="Entity workspace" builderActive={builderActive} focusOpen={focusOpen} focusPanel={focus} height="100dvh" layoutWidth={1440} minCenterWidth={builderActive ? 540 : 400} onFocusOpenChange={setFocusOpen} onRightOpenChange={() => undefined} rightCarriage={withLibrarian ? LIBRARIAN_CARRIAGE : undefined} rightOpen={withLibrarian}>
    {builderActive ? <div className={styles.builderFrame}><EntityBuilder entity={entity} session={session} onClose={() => setBuilderActive(false)} onFollow={() => setFocusOpen(true)}/></div> : <section aria-label="Desk" style={{ background: "var(--paper)", minHeight: "100dvh", padding: "96px 7vw" }}><p style={{ color: "var(--workflow-ink)", font: "600 11px var(--font-ui)", letterSpacing: ".12em", textTransform: "uppercase" }}>The Drowned Coast · Desk</p><h1 style={{ font: "clamp(2.5rem, 6vw, 5rem) var(--font-editorial)", margin: "18px 0" }}>{entity.representation?.label ?? "Untitled fragment"}</h1><p style={{ maxWidth: 520 }}>The Desk keeps the object spatial. Focus keeps its context nearby; Builder gives it room to become something more.</p></section>}
  </WorkspaceShell>;
}

export const CharacterFocus: Story = { render: () => <Scene initialEntity={character}/>, play: async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("tab", { name: "Overview" })).toBeVisible();
  await expect(canvas.getByRole("complementary", { name: /Character Focus/i })).toBeVisible();
} };

/** Kept as a stable Storybook slug; it now demonstrates the right-side Focus layer. */
export const CompactDossier: Story = { render: () => <Scene initialEntity={character}/> };
export const FullFocus: Story = { render: () => <Scene initialEntity={character}/> };

export const MechanicsPage: Story = { render: () => <Scene initialEntity={character} initialPage="mechanics"/>, play: async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("tab", { name: "Mechanics" })).toHaveAttribute("aria-selected", "true");
  await expect(canvas.getByRole("region", { name: "Mechanical profile" })).toBeVisible();
} };

export const BuilderAuthoring: Story = { render: () => <Scene initialEntity={character} initialBuilder/>, play: async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const builder = canvas.getByRole("region", { name: /Character Entity Builder/i });
  await expect(builder).toBeVisible();
  await userEvent.click(within(builder).getByText("A letter that never arrived"));
  await expect(within(builder).getByRole("textbox", { name: "Narrative" })).toBeVisible();
} };

export const BuilderWithLibrarian: Story = { render: () => <Scene initialEntity={character} initialBuilder withLibrarian/> };
export const ThreadDevelopments: Story = { render: () => <Scene initialEntity={thread} initialPage="history"/>, play: async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getByRole("tab", { name: "Developments" })).toHaveAttribute("aria-selected", "true");
  await expect(canvas.getByRole("button", { name: "Add development" })).toBeVisible();
} };

export const FailedSaveKeepsRichDraft: Story = { render: () => <Scene initialEntity={character} initialBuilder mode="failed"/>, play: async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const builder = canvas.getByRole("region", { name: /Character Entity Builder/i });
  await userEvent.click(within(builder).getByText("A letter that never arrived"));
  const editor = within(builder).getByRole("textbox", { name: "Narrative" });
  await userEvent.click(editor);
  await userEvent.type(editor, " A passage kept locally after a failed save.");
  await userEvent.keyboard("{Escape}");
  await expect(within(builder).getByText("Draft kept")).toBeVisible();
  await expect(canvas.getAllByText(/Your draft remains here/).length).toBeGreaterThan(0);
} };
