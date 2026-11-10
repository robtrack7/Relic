import { useRef, useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within, waitFor } from "storybook/test";
import type { ClaimId, DeskCard } from "@/lib/world/model";
import type { ResolvedObjectSnapshot } from "@/lib/world/object-projection";
import { WorldObjectCard } from "./world-object-card";
import { MARA, WATCHERS_SPIRE, LOOSE_FRAGMENT, TIDE_LEDGER, BELL_THREAD, THREAD_AT_SESSION_FOUR, THREAD_AT_SESSION_SIX, fixtureClaim } from "./object-fixtures";
import styles from "./object-stories.module.css";

const meta = { title: "World Objects/Cards", component: WorldObjectCard, parameters: { layout: "centered", a11y: { test: "error" } }, args: { card: MARA } } satisfies Meta<typeof WorldObjectCard>;
export default meta;
type Story = StoryObj<typeof meta>;

const FACTION = { ...MARA,
  representation: { ...MARA.representation!, kind: "faction" as const, label: "House Seradine", fields: { size: "Coastal noble house", gmNotes: "Its envoys control the western harbours." } },
  claims: [fixtureClaim(MARA, "goal", "Keep the old sea routes open."), fixtureClaim(MARA, "leader", "Lady Seradine"), fixtureClaim(MARA, "seat", "Greyhaven"), fixtureClaim(MARA, "status", "Active")]
};
const ARTIFACT = { ...MARA,
  representation: { ...MARA.representation!, kind: "artifact" as const, label: "The Tide Key", fields: { rarity: "Unique", attunement: "A bearer sworn to the coast", gmNotes: "It turns only at the lowest tide." } },
  claims: [fixtureClaim(MARA, "holder", "Mara Veyra"), fixtureClaim(MARA, "location", "Watcher’s Spire"), fixtureClaim(MARA, "origin", "The drowned archive")]
};
const EVENT = { ...BELL_THREAD,
  representation: { ...BELL_THREAD.representation!, kind: "event" as const, label: "The Third Toll", fields: {} },
  claims: [fixtureClaim(BELL_THREAD, "location", "Watcher’s Spire"), fixtureClaim(BELL_THREAD, "participants", "Mara Veyra and the harbour watch"), fixtureClaim(BELL_THREAD, "consequence", "The lower steps flooded", { story: { order: 800, precision: "relative", label: "Session 8 · At low tide" } })]
};

function DisclosureExample({ card }: { card: DeskCard }) {
  const [expanded, setExpanded] = useState(false);
  const [focus, setFocus] = useState(false);
  return <div className={styles.disclosure}><div style={{ width: expanded ? 500 : 340 }}><WorldObjectCard card={card} selected disclosure={expanded ? "expanded" : "card"} onExpand={() => setExpanded(!expanded)} onFocus={() => setFocus(!focus)}/></div>{focus ? <p role="status">Focus opens in the contextual dock in the workspace scene.</p> : null}</div>;
}
export const Character: Story = { render: args => <div style={{ width: 340 }}><WorldObjectCard {...args}/></div> };
export const CharacterDisclosure: Story = { render: () => <DisclosureExample card={MARA}/>, play: async ({ canvasElement }) => {
  const c = within(canvasElement);
  await userEvent.click(c.getByRole("button", { name: "Expand card" }));
  await waitFor(() => expect(c.getByText("Crown envoy", { selector: "p" })).toBeVisible());
  expect(c.queryByText("At the table")).toBeNull();
  expect(c.queryByRole("button", { name: "Show mechanics" })).toBeNull();
  await userEvent.click(c.getByRole("button", { name: "Collapse card" }));
  await waitFor(() => expect(c.queryByText("Crown envoy", { selector: "p" })).toBeNull());
  await waitFor(() => expect(canvasElement.querySelector('[data-transition]')).toBeNull());
} };
export const RapidDisclosure: Story = {
  render: () => <DisclosureExample card={MARA}/>,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const expand = () => c.getByRole("button", { name: "Expand card" });
    await userEvent.click(expand());
    await userEvent.click(c.getByRole("button", { name: "Collapse card" }));
    await userEvent.click(expand());
    await waitFor(() => expect(c.getByText("Crown envoy", { selector: "p" })).toBeVisible());
    await waitFor(() => expect(canvasElement.querySelector('[data-transition]')).toBeNull());
  }
};

function TransitionStudy() {
  const [expanded, setExpanded] = useState(false);
  const [paused, setPaused] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  return <div style={{display:'grid',gap:24}}>
    <div ref={frame} data-motion-study data-paused={paused || undefined} style={{width:expanded?520:340,transition:'width 260ms cubic-bezier(.16,1,.3,1)'}}>
      <WorldObjectCard card={MARA} disclosure={expanded?'expanded':'card'} onExpand={()=>setExpanded(value=>!value)}/>
    </div>
    <div role="group" aria-label="Inspect the transition" style={{display:'flex',gap:12}}>
      <button disabled={expanded} onClick={()=>{
        setExpanded(true);
        requestAnimationFrame(()=>requestAnimationFrame(()=>{
          frame.current?.getAnimations({subtree:true}).forEach(animation=>{animation.pause();animation.currentTime=110;});
          setPaused(true);
        }));
      }}>Pause midway</button>
      <button disabled={!paused} onClick={()=>{frame.current?.getAnimations({subtree:true}).forEach(animation=>animation.play());setPaused(false);}}>Resume transition</button>
      <button onClick={()=>{frame.current?.getAnimations({subtree:true}).forEach(animation=>animation.play());setPaused(false);setExpanded(false);}}>Reset card</button>
    </div>
  </div>;
}

export const InspectDisclosureTransition: Story = {
  render:()=> <TransitionStudy/>,
  play:async({canvasElement})=>{
    const c=within(canvasElement);
    await userEvent.click(c.getByRole('button',{name:'Pause midway'}));
    await waitFor(()=>expect(canvasElement.querySelector('[data-motion-study]')).toHaveAttribute('data-paused','true'));
    const width=canvasElement.querySelector('[data-motion-study]')!.getBoundingClientRect().width;
    expect(width).toBeGreaterThan(340);expect(width).toBeLessThan(520);
    await userEvent.click(c.getByRole('button',{name:'Resume transition'}));
    await waitFor(()=>expect(canvasElement.querySelector('[data-transition]')).toBeNull());
  }
};
const IMAGELESS_MARA = { ...MARA, representation: { ...MARA.representation!, fields: {} } };
const LONG_NAMES = [
  { ...MARA, representation: { ...MARA.representation!, label: "Archimandrite Seraphine Valcourt-Ashenmere of the Ninth Lantern" } },
  { ...LOOSE_FRAGMENT, body: "The lighthouse keeps watch even in storms that have no name, and the keeper writes each one down in a ledger nobody has asked to read, page after page, until the ink runs out and the sea keeps going regardless. Some nights he writes the names the storms would have chosen for themselves, if anyone had asked them, and some nights he writes nothing at all." },
  { ...BELL_THREAD, representation: { ...BELL_THREAD.representation!, label: "Who drowned the bell-ringer of Watcher’s Spire, and why does the harbour still hear him?" } }
];

/** Far is the Desk camera's simplification of the same Small Card, not a separate form. */
function FarWorld({ cards, scale }: { cards: readonly DeskCard[]; scale: number }) {
  return <div className={styles.farWorld} style={{ "--canvas-scale": scale } as React.CSSProperties}>{cards.map((card, index) => <div key={index} style={{ width: 300, height: 300, transform: `scale(${scale})` }}><WorldObjectCard card={card} disclosure="marker"/></div>)}</div>;
}

export const CharacterLadder: Story = { parameters: { layout: "fullscreen" }, render: () => <div className={styles.ladder}>
  <section><h2>Far (semantic zoom)</h2><div style={{ width: 340, height: 332 }}><WorldObjectCard card={MARA} disclosure="marker"/></div></section>
  <section><h2>Card</h2><div style={{ width: 340, height: 332 }}><WorldObjectCard card={MARA}/></div></section>
  <section><h2>Expanded card</h2><div style={{ width: 500 }}><WorldObjectCard card={MARA} disclosure="expanded"/></div></section>
  <section><h2>Without a portrait</h2><div style={{ display: "grid", gap: 24, width: 300 }}><WorldObjectCard card={IMAGELESS_MARA}/></div></section>
</div> };
export const BoundedRecognitionForms: Story = { render: () => <div style={{ display: "grid", gap: 20, width: 420 }}><WorldObjectCard card={MARA}/><WorldObjectCard card={MARA} disclosure="expanded"/></div>, play: async ({ canvasElement }) => {
  const small = canvasElement.querySelector('[data-recognition="small"]');
  const expanded = canvasElement.querySelector('[data-recognition="expanded"]');
  expect(small?.querySelector("[data-card-title]")).toHaveTextContent("Mara Veyra");
  expect(small?.querySelectorAll("p, dt, dd")).toHaveLength(0);
  expect(expanded?.querySelectorAll("dt").length).toBeLessThanOrEqual(3);
  expect(expanded?.querySelector("[data-identity-statement]")).toBeTruthy();
  expect(expanded?.textContent).not.toContain("At the table");
  expect(expanded?.textContent?.match(/Crown envoy/g)).toHaveLength(1);
} };
export const ImagelessCharacter: Story = { args: { card: IMAGELESS_MARA }, render: args => <div style={{ width: 280 }}><WorldObjectCard {...args}/></div>, play: async ({ canvasElement }) => {
  expect(canvasElement.querySelector("img")).toBeNull();
  expect(canvasElement.querySelector('[aria-hidden="true"] span')?.textContent).toBe("MV");
} };
export const LongContent: Story = { parameters: { layout: "fullscreen" }, render: () => <main className={styles.study}><div className={styles.specimens}>{LONG_NAMES.map((card, index) => <div key={index}><WorldObjectCard card={card}/></div>)}</div></main> };
export const FarTier: Story = { parameters: { layout: "fullscreen" }, render: () => <main className={styles.study}><header><h1>At a distance.</h1><p>Every family at 40% camera scale. Names stay at least 11px on screen.</p></header><FarWorld scale={0.4} cards={[MARA, IMAGELESS_MARA, WATCHERS_SPIRE, BELL_THREAD, TIDE_LEDGER, LOOSE_FRAGMENT, FACTION, ARTIFACT, EVENT]}/></main>, play: async ({ canvasElement }) => {
  for (const title of canvasElement.querySelectorAll<HTMLElement>("[data-card-title]")) {
    expect(title.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(Number.parseFloat(getComputedStyle(title).fontSize) * 0.4).toBeGreaterThanOrEqual(11);
  }
} };
export const Place: Story = { args: { card: WATCHERS_SPIRE }, render: args => <div style={{ width: 366 }}><WorldObjectCard {...args}/></div> };
export const CinematicPlace: Story = { args: { card: { ...WATCHERS_SPIRE, representation: { ...WATCHERS_SPIRE.representation!, fields: { ...WATCHERS_SPIRE.representation!.fields, composition: "cinematic" } } } }, render: args => <div style={{ width: 366 }}><WorldObjectCard {...args}/></div> };
export const Fragment: Story = { args: { card: LOOSE_FRAGMENT }, render: args => <div style={{ width: 310 }}><WorldObjectCard {...args}/></div> };
export const Source: Story = { args: { card: TIDE_LEDGER }, render: args => <div style={{ width: 390 }}><WorldObjectCard {...args}/></div> };
export const ExpandedPlace: Story = { args: { card: WATCHERS_SPIRE, disclosure: "expanded" }, render: args => <div style={{ width: 520 }}><WorldObjectCard {...args}/></div> };
export const ExpandedSource: Story = { args: { card: TIDE_LEDGER, disclosure: "expanded" }, render: args => <div style={{ width: 520 }}><WorldObjectCard {...args}/></div> };
export const ImageFragment: Story = { args: { card: { ...LOOSE_FRAGMENT, body: "![A misty coastal watchtower](/desk/blackwater-harbour.webp)\nRuins of the old watch settlement. Locals avoid the paths after dusk." } }, render: args => <div style={{ width: 340 }}><WorldObjectCard {...args}/></div> };
export const Quotation: Story = { args: { card: { ...LOOSE_FRAGMENT, body: "“We did what we had to, so the Continent could sleep.”\n\n— Letter fragment" } }, render: args => <div style={{ width: 370 }}><WorldObjectCard {...args}/></div> };
export const Selected: Story = { args: { selected: true }, render: args => <div style={{ width: 340, padding: 6 }}><WorldObjectCard {...args}/></div> };
export const PencilCharacter: Story = { args: { card: { ...MARA, maturity: "pencil", settled: null } }, render: args => <div style={{ width: 340 }}><WorldObjectCard {...args}/></div> };
export const Thread: Story = { args: { card: BELL_THREAD }, render: () => <DisclosureExample card={BELL_THREAD}/> };
export const Faction: Story = { args: { card: FACTION }, render: args => <div style={{ width: 340 }}><WorldObjectCard {...args}/></div> };
export const ExpandedFaction: Story = { args: { card: FACTION, disclosure: "expanded" }, render: args => <div style={{ width: 500 }}><WorldObjectCard {...args}/></div> };
export const Artifact: Story = { args: { card: ARTIFACT }, render: args => <div style={{ width: 340 }}><WorldObjectCard {...args}/></div> };
export const ExpandedArtifact: Story = { args: { card: ARTIFACT, disclosure: "expanded" }, render: args => <div style={{ width: 500 }}><WorldObjectCard {...args}/></div> };
export const Event: Story = { args: { card: EVENT }, render: args => <div style={{ width: 340 }}><WorldObjectCard {...args}/></div> };
export const ExpandedEvent: Story = { args: { card: EVENT, disclosure: "expanded" }, render: args => <div style={{ width: 500 }}><WorldObjectCard {...args}/></div> };
export const TextLed: Story = { args: { card: { ...MARA, representation: { ...MARA.representation!, fields: {} } } }, render: args => <div style={{ width: 340 }}><WorldObjectCard {...args}/></div> };
export const Empty: Story = { args: { card: { ...LOOSE_FRAGMENT, body: "" } }, render: args => <div style={{ width: 310 }}><WorldObjectCard {...args}/></div> };
export const InkWithPendingState: Story = { args: { card: { ...MARA, claims: [...MARA.claims, fixtureClaim(MARA, "status", "Missing", { id: "pending-mara-status" as ClaimId, truthState: "pencil", settled: null })] } }, render: args => <div style={{ width: 340 }}><WorldObjectCard {...args}/></div> };
// This story supplies already-resolved snapshots. Cards never reconstruct the past.
function ThreadAcrossTime() {
  const [snapshot, setSnapshot] = useState<ResolvedObjectSnapshot>();
  return <div className={styles.timeStudy}><nav aria-label="Story position"><button type="button" aria-pressed={snapshot === THREAD_AT_SESSION_FOUR} onClick={() => setSnapshot(THREAD_AT_SESSION_FOUR)}>Session 4</button><button type="button" aria-pressed={snapshot === THREAD_AT_SESSION_SIX} onClick={() => setSnapshot(THREAD_AT_SESSION_SIX)}>Session 6</button><button type="button" aria-pressed={!snapshot} onClick={() => setSnapshot(undefined)}>Now · after Session 8</button></nav><div style={{ width: 600, maxWidth: "100%" }}><WorldObjectCard card={BELL_THREAD} snapshot={snapshot} disclosure="expanded"/></div><p>Illustrative story positions · one persistent Thread</p></div>;
}
export const ThreadThroughStoryTime: Story = { render: () => <ThreadAcrossTime/>, play: async ({ canvasElement }) => { const c = within(canvasElement); await userEvent.click(c.getByRole("button", { name: "Session 4" })); await expect(c.queryByText("Mara Veyra")).toBeNull(); await expect(c.queryByText("The bell sounds again beneath the spire.")).toBeNull(); await expect(c.getByText("Dormant")).toBeVisible(); await userEvent.click(c.getByRole("button", { name: "Now · after Session 8" })); await expect(c.getByText("Active")).toBeVisible(); } };

// Intentionally compositionally varied; this is a specimen, not a dashboard.
export const FamilyStudy: Story = { parameters: { layout: "fullscreen" }, render: () => <main className={styles.study}><header><h1>A world, taking shape.</h1><p>Eight kinds of world material. One continuous story.</p></header><div className={styles.specimens}>{[MARA, WATCHERS_SPIRE, BELL_THREAD, TIDE_LEDGER, LOOSE_FRAGMENT, FACTION, ARTIFACT, EVENT, IMAGELESS_MARA, { ...LOOSE_FRAGMENT, objectId: "quote" as DeskCard["objectId"], body: "“We did what we had to, so the Continent could sleep.”\n\n— Letter fragment" }].map((card, index) => <div key={index}><WorldObjectCard card={card}/></div>)}</div></main> };
