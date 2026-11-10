import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { useRef, useState, type ComponentProps } from "react";
import { LIBRARIAN_CARRIAGE } from "@/components/carriage/carriage.fixtures";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import type { EntitySnapshot } from "@/lib/world/entity-document";
import { ENTITY_FIXTURES, ENTITY_FIXTURE_GROUPS, scopedEntityFixture } from "./entity-fixtures";
import { EntityBuilder, EntityFocus } from "./entity-surfaces";
import { configureEntityStoryActions, type EntityStorySaveMode } from "./entity-story-harness";
import { useEntitySession } from "./entity-session";
import styles from "./entity-workspace.module.css";
import "../../app/globals.css";

const meta = {
  title: "Entities/Focus and Builder",
  parameters: { layout: "fullscreen", backgrounds: { disable: true }, a11y: { test: "todo" } },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

type SaveMode = EntityStorySaveMode;

function DeskBackdrop({ entity, onOpenFocus, onSelectSibling }: { entity: EntitySnapshot; onOpenFocus: () => void; onSelectSibling: (entity: EntitySnapshot) => void }) {
  const siblingCards = [
    { label: "The Bell Below the Tide", kind: "Thread" },
    { label: "Watcher’s Spire", kind: "Place" },
    { label: "Tide ledger, folio 9", kind: "Source" },
  ];
  return <section aria-label="Desk" style={{ background: "var(--paper, #f7f4ef)", color: "var(--ink, #1a1916)", height: "100%", minHeight: "100dvh", overflow: "hidden", padding: "clamp(64px, 8vw, 112px) clamp(24px, 6vw, 96px)" }}>
    <header style={{ alignItems: "end", display: "flex", justifyContent: "space-between", marginBottom: 40, maxWidth: 900 }}>
      <div><p style={{ color: "var(--workflow-ink)", font: "600 11px/1 var(--font-ui)", letterSpacing: ".12em", margin: "0 0 12px", textTransform: "uppercase" }}>The Drowned Coast · Desk</p><h1 style={{ font: "600 clamp(2.2rem, 5vw, 4.3rem)/.92 var(--font-editorial)", margin: 0 }}>A world in motion.</h1></div>
      <button onClick={onOpenFocus} style={{ background: "var(--control-surface)", border: "1px solid var(--chrome-rule)", borderRadius: 999, color: "var(--workflow-ink)", cursor: "pointer", font: "600 12px/1 var(--font-ui)", padding: "12px 17px" }} type="button">Open {entity.representation?.label ?? "fragment"} Focus</button>
    </header>
    <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", maxWidth: 900 }}>
      <button onClick={onOpenFocus} style={{ background: "var(--control-surface)", border: "1px solid var(--workflow-amber)", borderRadius: 18, color: "inherit", cursor: "pointer", minHeight: 280, padding: 22, textAlign: "left" }} type="button"><span style={{ color: "var(--workflow-ink)", font: "600 11px/1 var(--font-ui)", letterSpacing: ".1em", textTransform: "uppercase" }}>Selected entity</span><strong style={{ display: "block", font: "600 2rem/1 var(--font-editorial)", marginTop: 80 }}>{entity.representation?.label ?? "Untitled fragment"}</strong><span style={{ display: "block", font: "15px/1.5 var(--font-editorial)", marginTop: 12 }}>A small card gives the Desk an identity. Focus keeps the depth nearby.</span></button>
      {siblingCards.map((card, index) => <button key={card.label} onClick={() => onSelectSibling(ENTITY_FIXTURES[index + 2]!)} style={{ alignSelf: index === 1 ? "end" : "start", background: "var(--context-surface)", border: "1px solid var(--chrome-rule)", borderRadius: 18, color: "inherit", cursor: "pointer", minHeight: 210, padding: 20, textAlign: "left" }} type="button"><span style={{ color: "var(--workflow-ink)", font: "600 10px/1 var(--font-ui)", letterSpacing: ".1em", textTransform: "uppercase" }}>{card.kind}</span><strong style={{ display: "block", font: "600 1.5rem/1.05 var(--font-editorial)", marginTop: 46 }}>{card.label}</strong><span style={{ display: "block", font: "13px/1.5 var(--font-ui)", marginTop: 10 }}>Arrange on the Desk · single click selects</span></button>)}
    </div>
  </section>;
}

type FocusStoryPage = "overview" | "mechanics" | "relationships" | "history" | "notes" | "sources" | "content";
function EntityWorkbench({ initialEntity, initialBuilder = false, withLibrarian = false, width = 1440, initialMode = "ok", initialPage = "overview", onMode }: { initialEntity: EntitySnapshot; initialBuilder?: boolean; withLibrarian?: boolean; width?: number; initialMode?: SaveMode; initialPage?: FocusStoryPage; onMode?: (setMode: (mode: SaveMode) => void) => void }) {
  const fixture = initialEntity;
  const [focusOpen, setFocusOpen] = useState(true);
  const [builderActive, setBuilderActive] = useState(initialBuilder);
  const [librarianOpen, setLibrarianOpen] = useState(withLibrarian);
  const [page, setPage] = useState<FocusStoryPage>(initialPage);
  const mode = useRef<SaveMode>(initialMode);
  const configured = useRef(false);
  if (!configured.current) { configureEntityStoryActions([fixture], mode); configured.current = true; }
  const { entity, session } = useEntitySession(String(fixture.worldId), String(fixture.objectId), fixture);
  const setMode = (next: SaveMode) => { mode.current = next; };
  onMode?.(setMode);
  if (!entity) return <div style={{ color: "var(--ink)", font: "14px var(--font-ui)", padding: 40 }}>Opening the entity session…</div>;
  const focus = <EntityFocus entity={entity} session={session} page={page} onPageChange={setPage} onBuilder={() => setBuilderActive(true)} onClose={() => setFocusOpen(false)} onFollow={() => setFocusOpen(true)} builderEntityId={builderActive ? entity.objectId : null}/>;
  return <WorkspaceShell ariaLabel="Entity workspace" builderActive={builderActive} focusOpen={focusOpen} focusPanel={focus} height="100dvh" layoutWidth={width} minCenterWidth={builderActive ? 540 : 400} onFocusOpenChange={setFocusOpen} onRightOpenChange={setLibrarianOpen} rightCarriage={withLibrarian ? LIBRARIAN_CARRIAGE : undefined} rightOpen={librarianOpen}>
    {builderActive ? <div className={styles.builderFrame}><EntityBuilder entity={entity} session={session} onClose={() => setBuilderActive(false)} onFollow={() => setFocusOpen(true)}/></div> : <DeskBackdrop entity={entity} onOpenFocus={() => setFocusOpen(true)} onSelectSibling={() => setFocusOpen(true)}/>} 
  </WorkspaceShell>;
}

function ControlledWorkbench(props: Omit<ComponentProps<typeof EntityWorkbench>, "onMode"> & { controls?: boolean }) {
  const [mode, setMode] = useState<SaveMode>(props.initialMode ?? "ok");
  const setter = useRef<(mode: SaveMode) => void>(() => {});
  return <><div style={{ alignItems: "center", background: "var(--ink)", color: "var(--paper)", display: props.controls ? "flex" : "none", gap: 8, justifyContent: "flex-end", padding: "8px 16px", position: "fixed", right: 0, top: 0, zIndex: 1000 }}><span style={{ font: "11px var(--font-ui)", marginRight: 6 }}>Story controls</span>{(["ok", "failed", "conflict"] as const).map(next => <button key={next} onClick={() => { setMode(next); setter.current(next); }} style={{ background: next === mode ? "var(--workflow-amber)" : "transparent", border: "1px solid var(--chrome-rule)", borderRadius: 999, color: "inherit", cursor: "pointer", font: "11px var(--font-ui)", padding: "5px 9px" }} type="button">{next}</button>)}</div><EntityWorkbench {...props} initialMode={mode} onMode={nextSetter => { setter.current = nextSetter; }}/></>;
}

const pc = scopedEntityFixture(ENTITY_FIXTURE_GROUPS.character[0]!, "journey");
const source = scopedEntityFixture(ENTITY_FIXTURE_GROUPS.source[0]!, "source");
const thread = scopedEntityFixture(ENTITY_FIXTURE_GROUPS.thread[0]!, "thread");
const artifact = scopedEntityFixture(ENTITY_FIXTURE_GROUPS.artifact[0]!, "artifact");
const fragment = scopedEntityFixture(ENTITY_FIXTURE_GROUPS.fragment[0]!, "fragment");
const note = scopedEntityFixture(ENTITY_FIXTURE_GROUPS.note[0]!, "note");

export const CardsFocusBuilderJourney: Story = {
  render: () => <ControlledWorkbench initialEntity={pc} />,
  play: async ({ canvasElement }) => {
    const scene = within(canvasElement);
    await expect(scene.getByRole("tab", { name: "Overview" })).toBeVisible();
    await userEvent.click(scene.getByRole("button", { name: "Open in Builder" }));
    await expect(scene.getByRole("region", { name: /Character Entity Builder/ })).toBeVisible();
    await userEvent.click(scene.getByRole("button", { name: "Close Entity Builder" }));
    await expect(scene.getByRole("tab", { name: "Overview" })).toBeVisible();
  },
};

export const CharacterFocusReading: Story = { render: () => <ControlledWorkbench initialEntity={pc} />, play: async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(await canvas.findByRole("tab", { name: "Overview" })).toBeVisible();
  await expect(canvas.getByRole("complementary", { name: /Character Focus/i })).toBeVisible();
} };
export const CharacterMechanics: Story = { render: () => <ControlledWorkbench initialEntity={pc} initialPage="mechanics" />, play: async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(await canvas.findByRole("tab", { name: "Mechanics" })).toHaveAttribute("aria-selected", "true");
  await expect(canvas.getByRole("region", { name: "Mechanical profile" })).toBeVisible();
} };
export const BuilderAuthoring: Story = { render: () => <ControlledWorkbench initialEntity={pc} initialBuilder />, play: async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const builder = await canvas.findByRole("region", { name: /Character Entity Builder/i });
  await expect(builder).toBeVisible();
  await userEvent.click(within(builder).getByText("A letter that never arrived"));
  await expect(within(builder).getByRole("textbox", { name: "Narrative" })).toBeVisible();
} };
export const BuilderWithSiblingLibrarian: Story = { render: () => <ControlledWorkbench initialBuilder withLibrarian initialEntity={pc} /> };
export const ConstrainedBuilderFocusSwitch: Story = { render: () => <ControlledWorkbench initialBuilder controls withLibrarian initialEntity={pc} width={1024} /> };
export const ArtifactProperties: Story = { render: () => <ControlledWorkbench initialEntity={artifact} /> };
export const ThreadDevelopments: Story = { render: () => <ControlledWorkbench initialEntity={thread} /> };
export const SourceProvenance: Story = { render: () => <ControlledWorkbench initialEntity={source} /> };
export const SparseFragment: Story = { render: () => <ControlledWorkbench initialEntity={fragment} initialPage="content" /> };
export const PrivateNote: Story = { render: () => <ControlledWorkbench initialEntity={note} initialPage="content" /> };
export const ClearingNotesKeepsEditor: Story = {
  render: () => <ControlledWorkbench initialEntity={scopedEntityFixture(pc, "clearing-notes")} initialPage="notes" />,
  play: async ({ canvasElement }) => {
    const scene = within(canvasElement);
    const focus = within(scene.getByRole("complementary", { name: /Character Focus/ }));
    await userEvent.click(focus.getByLabelText(/GM notes; press Enter to write/i));
    const editor = await focus.findByRole("textbox", { name: /GM notes/i });
    await userEvent.clear(editor);
    await expect(focus.getByRole("tab", { name: "Notes" })).toHaveAttribute("aria-selected", "true");
    await expect(editor).toBeVisible();
    await userEvent.type(editor, "A replacement private note, still in its original block.");
    await userEvent.keyboard("{Escape}");
    await expect(focus.getByText("A replacement private note, still in its original block.")).toBeVisible();
  },
};

export const AutosaveFailureKeepsDraft: Story = {
  render: () => <ControlledWorkbench controls initialBuilder initialEntity={pc} initialMode="failed" />,
  play: async ({ canvasElement }) => {
    const scene = within(canvasElement);
    const builder = scene.getByRole("region", { name: /Character Entity Builder/i });
    await userEvent.click(within(builder).getByText("A letter that never arrived"));
    await expect(within(builder).getByRole("textbox", { name: "Narrative" })).toBeVisible();
  },
};

export const ConflictRecovery: Story = {
  render: () => <ControlledWorkbench controls initialBuilder initialEntity={thread} initialMode="conflict" />,
  play: async ({ canvasElement }) => {
    const scene = within(canvasElement);
    await expect(scene.getByRole("region", { name: /Thread Entity Builder/ })).toBeVisible();
    await expect(scene.getByText(/Story controls/)).toBeVisible();
  },
};

export const FamilyStressBoard: Story = {
  render: () => <FamilyStressScene />,
};

function FamilyStressScene() {
  const [selected, setSelected] = useState<EntitySnapshot>(source);
  const options = [source, thread, artifact, fragment, note];
  return <div style={{ minHeight: "100dvh" }}><nav aria-label="Fixture family" style={{ background: "var(--paper)", borderBottom: "1px solid var(--chrome-rule)", display: "flex", flexWrap: "wrap", gap: 8, padding: "12px 18px" }}>{options.map(entity => <button key={entity.objectId} onClick={() => setSelected(entity)} style={{ background: selected.objectId === entity.objectId ? "var(--workflow-ink)" : "transparent", border: "1px solid var(--chrome-rule)", borderRadius: 999, color: selected.objectId === entity.objectId ? "var(--paper)" : "var(--ink)", cursor: "pointer", font: "600 11px var(--font-ui)", padding: "8px 12px" }} type="button">{entity.representation?.kind ?? "fragment"}</button>)}</nav><EntityWorkbench key={selected.objectId} initialEntity={selected} initialPage={!selected.representation || selected.representation.kind === "note" ? "content" : "overview"}/></div>;
}
