import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { richText, type MechanicsProfile } from "@/lib/world/entity-document";
import { statBlockLayout } from "@/lib/world/mechanics-presentation";
import { MechanicsStatBlock } from "@/components/entities/mechanics-stat-block";

afterEach(cleanup);

const f = (id: string, label: string, group: string, value: string | number) => ({ id, label, group, value });
const FIVE_E: MechanicsProfile = {
  schemaVersion: 1, system: "D&D 5e", variant: "pc",
  fields: [
    f("speed", "Speed", "Movement", "30 ft."), f("ac", "AC", "Defenses", 14),
    f("str", "Strength", "Attributes", 10), f("dex", "Dexterity", "Attributes", 16),
    f("skills", "Skills", "Proficiencies", "Insight +5, Persuasion +7, History +6"),
    f("senses", "Senses", "Proficiencies", "Passive Perception 13"),
    f("blank", "Languages", "Proficiencies", ""),
  ],
  resources: [{ id: "hp", label: "Hit Points", current: 32, max: 38 }],
  features: ["One", "Two", "Three", "Four"].map(name => ({ id: name, name, description: richText(`${name} rules text.`) })),
  equipment: [{ id: "key", label: "Brass wick key", objectId: "object-key" }],
  notes: richText(""),
};
const CUSTOM: MechanicsProfile = { ...FIVE_E, system: "A different game", variant: "general", resources: [], features: [], equipment: [],
  fields: [f("stress", "stress", "Statistics", 3), f("hope", "hope", "Statistics", 0), f("str", "STR", "Attributes", 16), f("moves", "Moves", "Reference", "Turn the tide.")] };

function Editable({ initial, onChange }: { initial: MechanicsProfile; onChange: (next: MechanicsProfile) => void }) {
  const [profile, setProfile] = useState(initial);
  return <MechanicsStatBlock profile={profile} depth="builder" onChange={next => { setProfile(next); onChange(next); }}/>;
}

describe("statBlockLayout", () => {
  it("puts the ruleset's declared vitals in the strip and derives only what the ruleset declares", () => {
    const layout = statBlockLayout(FIVE_E);
    expect(layout.vitals.map(vital => vital.kind === "field" ? vital.field.label : vital.resource.label)).toEqual(["Hit Points", "AC", "Speed"]);
    expect(layout.attributes.map(attribute => [attribute.display, attribute.modifier])).toEqual([["STR", 0], ["DEX", 3]]);
    expect(layout.groups.flatMap(group => group.fields.map(field => field.label))).toEqual(["Skills", "Senses"]);
  });

  it("falls back to recorded numbers for an unknown ruleset without inventing modifiers", () => {
    const layout = statBlockLayout(CUSTOM);
    expect(layout.vitals.map(vital => vital.kind === "field" ? vital.field.label : "")).toEqual(["stress", "hope"]);
    expect(layout.attributes[0]).toMatchObject({ display: "STR", modifier: null });
  });
});

describe("MechanicsStatBlock", () => {
  it("reads as one typeset block at Focus depth with labels exactly as recorded", () => {
    const onReference = vi.fn();
    render(<MechanicsStatBlock profile={FIVE_E} depth="focus" onReference={onReference}/>);
    expect(screen.getByText("AC")).toBeTruthy();
    expect(screen.getByText("Insight +5, Persuasion +7, History +6")).toBeTruthy();
    expect(screen.queryByText("Languages")).toBeNull();
    expect(screen.getByText("Four")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    screen.getByRole("button", { name: "Brass wick key" }).click();
    expect(onReference).toHaveBeenCalledWith("object-key");
  });

  it("keeps the card to vitals, attributes, and the top three features", () => {
    render(<MechanicsStatBlock profile={FIVE_E} depth="card"/>);
    expect(within(screen.getByRole("group", { name: "Features" })).queryByText("Four")).toBeNull();
    expect(screen.getByText("1 more in Focus")).toBeTruthy();
    expect(screen.queryByText("Skills")).toBeNull();
    expect(screen.getByText("DEX")).toBeTruthy();
  });

  it("does not insert D&D statistics into another ruleset", () => {
    render(<MechanicsStatBlock profile={CUSTOM} depth="focus"/>);
    expect(screen.getByText("stress")).toBeTruthy();
    expect(screen.queryByText("AC")).toBeNull();
    expect(screen.queryByText(/\(\+3\)/)).toBeNull();
  });

  it("edits a value in place from the keyboard, and Escape restores it", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Editable initial={FIVE_E} onChange={onChange}/>);
    await user.click(screen.getByRole("button", { name: /^AC: 14/ }));
    await user.keyboard("{Control>}a{/Control}15{Enter}");
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ fields: expect.arrayContaining([expect.objectContaining({ id: "ac", value: 15 })]) }));
    expect(screen.getByRole("button", { name: /^AC: 15/ })).toBeTruthy();

    onChange.mockClear();
    screen.getByRole("button", { name: /^Speed: 30 ft\./ }).focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{Control>}a{/Control}40 ft.{Escape}");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /^Speed: 30 ft\./ })).toBeTruthy();
  });

  it("steps a resource and keeps the template structure in one panel", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Editable initial={FIVE_E} onChange={onChange}/>);
    await user.click(screen.getByRole("button", { name: "Increase Hit Points" }));
    expect(onChange.mock.lastCall?.[0].resources[0].current).toBe(33);

    await user.click(screen.getByText("Template"));
    await user.selectOptions(screen.getByRole("combobox", { name: "Mechanical role" }), "adversary");
    expect(onChange.mock.lastCall?.[0].variant).toBe("adversary");
    await user.type(screen.getByRole("textbox", { name: "New mechanical field" }), "Initiative");
    await user.click(screen.getByRole("button", { name: "Add field" }));
    expect(onChange.mock.lastCall?.[0].fields.at(-1)).toMatchObject({ label: "Initiative", value: 0 });
    await user.click(screen.getByRole("button", { name: "Move Speed down" }));
    expect(onChange.mock.lastCall?.[0].fields.map((field: { id: string }) => field.id).slice(0, 2)).toEqual(["ac", "speed"]);
  });

  it("offers a quiet way to add statistics when the profile is sparse", async () => {
    const user = userEvent.setup();
    const sparse: MechanicsProfile = { ...CUSTOM, fields: [f("grit", "Grit", "Statistics", 3), f("luck", "Luck", "Statistics", "")] };
    const { unmount } = render(<MechanicsStatBlock profile={sparse} depth="focus"/>);
    expect(screen.queryByText("Luck")).toBeNull();
    unmount();
    render(<Editable initial={sparse} onChange={vi.fn()}/>);
    await user.click(screen.getByRole("button", { name: "Add statistics" }));
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "New mechanical field" }));
  });
});
