import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { useState, type ReactNode } from "react";
import { richText, type MechanicsProfile } from "@/lib/world/entity-document";
import { MechanicsStatBlock } from "./mechanics-stat-block";
import "../../app/globals.css";

const prose = richText;
const f = (id: string, label: string, group: string, value: string | number) => ({ id, label, group, value });

export const FIVE_E_PC: MechanicsProfile = {
  schemaVersion: 1, system: "D&D 5e", variant: "pc",
  fields: [
    f("ac", "Armor Class", "Defenses", 14), f("speed", "Speed", "Movement", "30 ft."), f("init", "Initiative", "Combat", "+3"),
    f("str", "Strength", "Attributes", 10), f("dex", "Dexterity", "Attributes", 16), f("con", "Constitution", "Attributes", 12),
    f("int", "Intelligence", "Attributes", 14), f("wis", "Wisdom", "Attributes", 13), f("cha", "Charisma", "Attributes", 18),
    f("level", "Level", "Character", 5), f("class", "Class", "Character", "Rogue (Swashbuckler)"), f("prof", "Proficiency Bonus", "Character", "+3"),
    f("saves", "Saving Throws", "Proficiencies", "Dex +6, Int +5"),
    f("skills", "Skills", "Proficiencies", "Acrobatics +6, Deception +7, History +5, Insight +4, Persuasion +10, Sleight of Hand +6"),
    f("senses", "Senses", "Proficiencies", "Passive Perception 11, Passive Insight 14"),
    f("languages", "Languages", "Proficiencies", "Common, Elvish, Old Seradine, Thieves’ Cant"),
  ],
  resources: [{ id: "hp", label: "Hit Points", current: 32, max: 38 }, { id: "hd", label: "Hit Dice", current: 4, max: 5 }, { id: "insp", label: "Inspiration", current: 1, max: 1 }],
  features: [
    { id: "sneak", name: "Sneak Attack", description: prose("Once per turn, deal an extra 3d6 damage to one creature you hit with an attack if you have advantage on the attack roll, or if another enemy of the target is within 5 feet of it.") },
    { id: "fancy", name: "Fancy Footwork", description: prose("During your turn, if you make a melee attack against a creature, that creature can’t make opportunity attacks against you for the rest of your turn.") },
    { id: "rakish", name: "Rakish Audacity", description: prose("Add your Charisma modifier to initiative rolls. You can use Sneak Attack against a creature within 5 feet of you if no other creatures are within 5 feet of you, even without advantage, provided you don’t have disadvantage on the attack roll.") },
    { id: "composure", name: "Courtly Composure", description: prose("Mara keeps her face still when lied to. She has advantage on Insight checks made against nobles of the Seradine court, and a noble who tries to provoke her into a public scene must first succeed on a Deception check against her passive Insight. Once she has caught a noble in a lie, she remembers it; the lie can be named at the table as leverage during any later negotiation with that house.") },
    { id: "rapier", name: "Rapier", description: prose("Melee Weapon Attack: +6 to hit, reach 5 ft., one target. Hit: 7 (1d8 + 3) piercing damage.") },
  ],
  equipment: [{ id: "e1", label: "Weathered rapier" }, { id: "e2", label: "Sealed letter case" }, { id: "e3", label: "Brass wick key", objectId: "story-wick-key" }, { id: "e4", label: "Thieves’ tools" }],
  notes: prose("Her loyalties remain authored narrative and should not be inferred from this sheet."),
};

export const ADVERSARY: MechanicsProfile = {
  schemaVersion: 1, system: "D&D 5e", variant: "adversary",
  fields: [
    f("type", "Type", "Profile", "Medium monstrosity, chaotic neutral"),
    f("ac", "Armor Class", "Defenses", "15 (natural armor)"), f("speed", "Speed", "Movement", "30 ft."),
    f("str", "STR", "Abilities", 16), f("dex", "DEX", "Abilities", 14), f("con", "CON", "Abilities", 17), f("int", "INT", "Abilities", 5), f("wis", "WIS", "Abilities", 12), f("cha", "CHA", "Abilities", 5),
    f("skills", "Skills", "Reference", "Perception +3"), f("resist", "Damage Resistances", "Reference", "poison"),
    f("immune", "Condition Immunities", "Reference", "charmed, frightened"), f("senses", "Senses", "Reference", "blindsight 10 ft., passive Perception 13"),
    f("languages", "Languages", "Reference", "Common"), f("cr", "Challenge", "Reference", "3 (700 XP)"),
  ],
  resources: [{ id: "hp", label: "Hit Points", current: 75, max: 75 }],
  features: [
    { id: "parasite", name: "Parasite", description: prose("While the snakes remain within the head of the host, it is indistinguishable from a Woodland Huntsman, except that it wears a linen sack over its head. As soon as the Snake Parasite rolls for initiative its parasite breaks out of its head.") },
    { id: "host", name: "Host", description: prose("The host of the snake parasite is a corpse controlled by the snake like a puppet. The Snake Parasite has advantage on saving throws against being stunned, paralyzed and being poisoned.") },
    { id: "multi", name: "Multiattack", description: prose("The Snake Parasite makes two Bite attacks. It can replace one of these attacks to attempt to grapple a target.") },
    { id: "bite", name: "Bite", description: prose("Melee Weapon Attack: +5 to hit, reach 10 ft., one target. Hit: 7 (1d8 + 3) piercing damage plus 7 (2d6) poison damage. This attack is made with advantage against a creature grappled by the Snake Parasite.") },
  ],
  equipment: [], notes: prose(""),
};

export const BLADES_PC: MechanicsProfile = {
  schemaVersion: 1, system: "Blades in the Dark", variant: "pc",
  fields: [
    f("harm", "Harm", "Condition", "Level 1: Battered"), f("trauma", "Trauma", "Condition", "Cold"), f("armor", "Armor", "Condition", "Standard (used)"),
    f("insight", "Insight", "Attributes", 2), f("prowess", "Prowess", "Attributes", 3), f("resolve", "Resolve", "Attributes", 1),
    f("hunt", "Hunt", "Insight actions", 1), f("study", "Study", "Insight actions", 2), f("survey", "Survey", "Insight actions", 0), f("tinker", "Tinker", "Insight actions", 0),
    f("finesse", "Finesse", "Prowess actions", 2), f("prowl", "Prowl", "Prowess actions", 1), f("skirmish", "Skirmish", "Prowess actions", 2), f("wreck", "Wreck", "Prowess actions", 0),
    f("attune", "Attune", "Resolve actions", 0), f("command", "Command", "Resolve actions", 1), f("consort", "Consort", "Resolve actions", 1), f("sway", "Sway", "Resolve actions", 2),
    f("playbook", "Playbook", "Character", "Lurk"), f("vice", "Vice", "Character", "Obligation — the Lamplighters’ Compact"), f("coin", "Coin", "Character", 2), f("stash", "Stash", "Character", 8),
  ],
  resources: [{ id: "stress", label: "Stress", current: 4, max: 9 }, { id: "xp", label: "Playbook XP", current: 3, max: 8 }],
  features: [
    { id: "infiltrator", name: "Infiltrator", description: prose("You are not affected by quality or Tier when you bypass security measures.") },
    { id: "shadow", name: "Like Looking into a Mirror", description: prose("You can always tell when someone is lying to you.") },
  ],
  equipment: [{ id: "g1", label: "Fine lockpicks" }, { id: "g2", label: "Climbing gear" }, { id: "g3", label: "Dark-sight goggles" }],
  notes: prose(""),
};

export const SPARSE: MechanicsProfile = {
  schemaVersion: 1, system: "Homebrew", variant: "general",
  fields: [f("grit", "Grit", "Statistics", 3), f("luck", "Luck", "Statistics", ""), f("oath", "Oath", "Statistics", "")],
  resources: [], features: [], equipment: [], notes: prose(""),
};

export const EMPTY: MechanicsProfile = { schemaVersion: 1, system: "General", variant: "general", fields: [], resources: [], features: [], equipment: [], notes: prose("") };

function Depths({ initial }: { initial: MechanicsProfile }) {
  const [profile, setProfile] = useState(initial);
  const column = (label: string, width: number, children: ReactNode) => <section aria-label={`${label} depth`} style={{ width, flex: "0 0 auto" }}>
    <p style={{ margin: "0 0 10px", color: "var(--ink-quiet)", font: "var(--type-label)" }}>{label} · {width}px</p>{children}</section>;
  return <div style={{ display: "flex", gap: 40, alignItems: "flex-start", padding: 32, minHeight: "100dvh", background: "var(--paper, #f7f4ef)", color: "var(--ink)" }}>
    {column("Card", 260, <div style={{ padding: 16, borderRadius: 14, background: "var(--card-raised, #fffdf9)", border: "1px solid var(--chrome-rule)" }}><MechanicsStatBlock profile={profile} depth="card"/></div>)}
    {column("Focus", 375, <div style={{ padding: "16px 20px", background: "var(--context-surface, #f3eeea)", borderRadius: 14 }}><MechanicsStatBlock profile={profile} depth="focus" onReference={() => {}}/></div>)}
    {column("Builder", 560, <MechanicsStatBlock profile={profile} depth="builder" onChange={setProfile} onReference={() => {}}/>)}
  </div>;
}

const meta = { title: "Entities/Mechanics stat block", excludeStories: /^[A-Z0-9_]+$/, parameters: { layout: "fullscreen" } } satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const PlayerCharacter5e: Story = { render: () => <Depths initial={FIVE_E_PC}/>, play: async ({ canvasElement }) => {
  const builder = within(within(canvasElement).getByRole("region", { name: "Builder depth" }));
  await userEvent.click(builder.getByRole("button", { name: /^Hit Points current: 32/ }));
  await userEvent.keyboard("{Control>}a{/Control}30{Enter}");
  await expect(builder.getByRole("button", { name: /^Hit Points current: 30/ })).toBeVisible();
  await userEvent.click(builder.getByRole("button", { name: "Increase Hit Points" }));
  await expect(builder.getByRole("button", { name: /^Hit Points current: 31/ })).toBeVisible();
} };
export const Adversary: Story = { render: () => <Depths initial={ADVERSARY}/> };
export const BladesLike: Story = { render: () => <Depths initial={BLADES_PC}/> };
export const Sparse: Story = { render: () => <Depths initial={SPARSE}/> };
export const Empty: Story = { render: () => <Depths initial={EMPTY}/> };
