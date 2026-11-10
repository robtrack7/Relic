import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import "../../app/globals.css";
import { CarriageEmpty, CarriageFooter, CarriageHeader, CarriageLauncher, CarriageSection, CarriageShell } from "./carriage";
import { PREPARE_CARRIAGE, STAGE_CARRIAGE, LIBRARIAN_CARRIAGE } from "./carriage.fixtures";
import { WorkspaceShell, type WorkspaceCarriageDefinition } from "@/components/workspace/workspace-shell";
import styles from "./carriage.stories.module.css";

const meta = { title: "Carriages/Scaffold", parameters: { layout: "fullscreen", backgrounds: { disable: true }, a11y: { test: "error" } } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
function Study({ definition }: { definition: WorkspaceCarriageDefinition }) {
  return <div className={styles.stage}><div className={styles.single}><WorkspaceShell height="100%" layoutWidth={360} minCenterWidth={0} {...(definition.id === "librarian" ? { rightCarriage: definition, defaultRightOpen: true } : { leftCarriage: definition, defaultLeftOpen: true })}><p className={styles.studyCaption}>Reopen the carriage to continue.</p></WorkspaceShell></div></div>;
}
export const BasicInteractive: Story = { render: () => <Study definition={PREPARE_CARRIAGE} /> };
export const PrepareStudy: Story = { render: () => <Study definition={PREPARE_CARRIAGE} /> };
export const StageStudy: Story = { render: () => <Study definition={STAGE_CARRIAGE} /> };
export const LibrarianStudy: Story = { render: () => <Study definition={LIBRARIAN_CARRIAGE} /> };
function FamilySpecimen({ definition }: { definition: WorkspaceCarriageDefinition }) {
  const [open, setOpen] = useState(true);
  const side = definition.id === "librarian" ? "right" : "left";
  return <div className={styles.family}>
    <div hidden={!open} style={{ height: "100%" }}>{definition.render ? definition.render({ side, mode: "study", width: 360, open, onCollapse: () => setOpen(false) }) : <CarriageShell side={side} mode="study" width={360} variant={definition.variant} id={`family-${definition.id}`} ariaLabel={`${definition.label} carriage`}
      header={<CarriageHeader side={side} title={definition.title} variant={definition.variant} status={definition.status} eyebrow={definition.eyebrow} onCollapse={() => setOpen(false)} />}
      context={definition.context} actions={definition.actions} footer={<CarriageFooter>{definition.footer}</CarriageFooter>}>{definition.content}</CarriageShell>}</div>
    {!open ? <CarriageLauncher label={definition.label} side={side} variant={definition.variant ?? "neutral"} controls={`family-${definition.id}`} onOpen={() => setOpen(true)} /> : null}
  </div>;
}
export const FamilyComparison: Story = { render: () => <div className={styles.comparison}>{[PREPARE_CARRIAGE, STAGE_CARRIAGE, LIBRARIAN_CARRIAGE].map(definition => <FamilySpecimen key={definition.id} definition={definition} />)}</div> };
export const DockedLaunchers: Story = { render: () => <WorkspaceShell height="100dvh" leftCarriage={PREPARE_CARRIAGE} rightCarriage={LIBRARIAN_CARRIAGE}><span /></WorkspaceShell> };
export const EmptyAndBasicStates: Story = { render: () => <div className={styles.stage}><div className={styles.single}><CarriageShell side="left" mode="study" variant="prepare" width={336} ariaLabel="Empty Prepare carriage" header={<CarriageHeader side="left" title="Prepare" variant="prepare" status="Draft" />}><CarriageEmpty title="An evening takes shape" detail="Gather the first scene when you know where tonight begins." /><CarriageSection title="Pinned references" emptyMessage="References you gather will stay within reach." /></CarriageShell></div></div> };
export const OverflowAndLongContent: Story = { render: () => <Study definition={{ ...PREPARE_CARRIAGE, title: "A long evening in the flooded archives of Blackwater", content: <>{Array.from({ length: 12 }, (_, index) => <CarriageSection key={index} title={"Scene " + (index + 1)} collapsible><p className={styles.prose}>Mara now carries the harbourmaster’s seal, though its authority remains disputed by the crews at the western quay.</p></CarriageSection>)}</> }} /> };
