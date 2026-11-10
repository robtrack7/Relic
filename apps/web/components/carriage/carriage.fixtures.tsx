import { CarriageSection } from "./carriage";
import { Button, ButtonGroup } from "@/components/ui/control";
import { fn } from "storybook/test";
import { Librarian } from "@/components/desk/librarian";
import { LIBRARIAN_COMPOSITION, librarianFixtureRequest } from "@/components/librarian/librarian.fixtures";
import type { WorkspaceCarriageDefinition } from "@/components/workspace/workspace-shell";
import styles from "./carriage.stories.module.css";

function ContextRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className={styles.contextRow}><span>{label}</span><strong>{children}</strong></div>;
}
function Scenes() {
  return <ol className={styles.sceneList}>
    {["Arrival at Blackwater", "Three knocks beneath the quay", "The flooded archive", "A promise comes due"].map((scene, index) => <li key={scene} className={styles.scene} data-current={index === 1 || undefined}><span>{index + 1}</span><strong>{scene}</strong>{index === 1 ? <small>Current</small> : null}</li>)}
  </ol>;
}
const unavailable = "Presentation preview. This workflow is not implemented yet.";
const request = librarianFixtureRequest();
const followSource = fn().mockName("Open cited source");
const acted = fn().mockName("Apply authorized result");
export const PREPARE_CARRIAGE: WorkspaceCarriageDefinition = {
  id: "prepare", label: "Prepare", title: "Prepare", variant: "prepare", status: "Draft", eyebrow: "Session 08", defaultWidth: 336, minWidth: 300, maxWidth: 420,
  context: <CarriageSection title="Session context" density="compact"><div className={styles.rows}><ContextRow label="Session">The Drowned Bell</ContextRow><ContextRow label="Place">Blackwater Harbour</ContextRow><ContextRow label="Focus">Promises & consequences</ContextRow></div></CarriageSection>,
  content: <>
    <CarriageSection title="Session brief" collapsible><p className={styles.prose}>Follow the missing crews through the tide ledger. Let the harbour factions reveal the cost of silence.</p></CarriageSection>
    <CarriageSection title="Scenes" meta="4" collapsible><Scenes /></CarriageSection>
    <CarriageSection title="Pinned references" meta="2" collapsible><div className={styles.rows}><ContextRow label="Source">Tide ledger, folio 9</ContextRow><ContextRow label="Character">Mara Vey</ContextRow></div></CarriageSection>
  </>,
  actions: <ButtonGroup label="Prepare actions"><Button disabled title={unavailable}>Add scene</Button><Button disabled title={unavailable}>Add beat</Button></ButtonGroup>,
  footer: <span>Plan & gather · Session preview</span>
};
export const STAGE_CARRIAGE: WorkspaceCarriageDefinition = {
  id: "stage", label: "Stage", title: "Stage", variant: "stage", status: "Live", eyebrow: "Session 08", defaultWidth: 336, minWidth: 300, maxWidth: 420,
  context: <CarriageSection title="Live context" density="compact"><div className={styles.rows}><ContextRow label="Scene">Three knocks beneath the quay</ContextRow><ContextRow label="Time"><span className={styles.time}>00:47:18</span></ContextRow><ContextRow label="Participants">5 active · 2 instances</ContextRow></div></CarriageSection>,
  content: <>
    <CarriageSection title="Encounter flow" meta="4 turns" collapsible><ol className={styles.sceneList}>{["Seraphine", "Kaelen", "Brother Aldren", "Mara Vey"].map((name, index) => <li key={name} className={styles.scene} data-current={index === 0 || undefined}><span>{index + 1}</span><strong>{name}</strong><small>{index === 0 ? "Active" : index === 1 ? "Up next" : "Waiting"}</small></li>)}</ol></CarriageSection>
    <CarriageSection title="Scene stack" collapsible defaultOpen={false}><Scenes /></CarriageSection>
    <CarriageSection title="Capture" collapsible><p className={styles.prose}>Entering the flooded archive</p><p className={styles.caption}>Last marked moment · 00:42:11</p><div className={styles.contextRow}><span>Recent captures</span><strong>3 fragments</strong></div></CarriageSection>
  </>,
  actions: <div className={styles.actionGrid}>{["Capture", "Dice", "Mark", "Record", "Notes", "More"].map(action => <Button key={action} disabled title={unavailable}>{action}</Button>)}</div>,
  footer: <span>Run & capture · Session preview</span>
};
export const LIBRARIAN_CARRIAGE: WorkspaceCarriageDefinition = {
  id: "librarian", label: "Librarian", title: "Librarian", variant: "librarian", status: "Ready", eyebrow: "Blackwater Board", defaultWidth: 352, minWidth: 316, maxWidth: 440,
  render: carriage => <Librarian carriage={carriage} open={carriage.open} onOpenChange={() => carriage.onCollapse()}
    compositionId={LIBRARIAN_COMPOSITION} compositionName="Blackwater Board" focusCardId={null} focusLabel={null}
    selectedCardIds={[]} onFollowSource={followSource} onActed={acted} here={() => ({ x: 0, y: 0 })} request={request} />
};
