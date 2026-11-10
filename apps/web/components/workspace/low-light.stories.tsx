import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CarriageHeader, CarriageSection, CarriageShell } from "@/components/carriage/carriage";
import { MechanicsStatBlock } from "@/components/entities/mechanics-stat-block";
import { ADVERSARY } from "@/components/entities/mechanics-stat-block.stories";
import { WorldObjectCard } from "@/components/world-objects/world-object-card";
import { BELL_THREAD, MARA, TIDE_LEDGER } from "@/components/world-objects/object-fixtures";
import styles from "./low-light.module.css";
import "../../app/globals.css";

/**
 * P8 study: the live-play reference a GM reads mid-session (Stage running
 * order, an expanded character, a thread, a stat block) in each candidate
 * low-light treatment beside today's daylight. A decision aid; nothing ships.
 */
const meta = { title: "Studies/Low-light Stage", parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function Room({ name, note, className = "" }: { name: string; note: string; className?: string }) {
  return <section className={`${styles.room} ${className}`} aria-label={name}>
    <header><strong>{name}</strong><span>{note}</span></header>
    <div className={styles.scene}>
      <CarriageShell side="left" mode="study" variant="stage" width={300} ariaLabel={`${name}: Stage carriage`}
        header={<CarriageHeader side="left" title="Stage" variant="stage" status="Session 9 · live" statusTone="ready" />}>
        <CarriageSection title="Now">
          <p>The bell sounds beneath the spire. Mara reaches the lower door before the tide turns.</p>
        </CarriageSection>
        <CarriageSection title="Next">
          <p>The ledger’s fourth hand. If the crews follow the knock, the Compact is waiting.</p>
        </CarriageSection>
      </CarriageShell>
      <div className={styles.cards}>
        <WorldObjectCard card={MARA} disclosure="expanded" />
        <WorldObjectCard card={BELL_THREAD} />
        <div className={styles.mechanics}><MechanicsStatBlock profile={ADVERSARY} depth="focus" editable={false} /></div>
        <WorldObjectCard card={TIDE_LEDGER} />
      </div>
    </div>
  </section>;
}

export const Comparison: Story = {
  render: () => <main className={styles.page}>
    <header>
      <h1>Low-light Stage</h1>
      <p>Live play happens in dim rooms (PRODUCT.md). The same Stage, card, thread and stat block in two candidate treatments beside today’s daylight. Every text pair holds WCAG AA on every surface. Choose one, or neither, before anything ships.</p>
    </header>
    <div className={styles.options}>
      <Room name="A · Lamplit" note="Warm dark surface, parchment ink at about 11:1" className={styles.lamplit} />
      <Room name="B · Dusk paper" note="The paper world, about a third less light" className={styles.dusk} />
      <Room name="Today · Daylight" note="Current tokens, for reference" className={styles.daylight} />
    </div>
  </main>
};
