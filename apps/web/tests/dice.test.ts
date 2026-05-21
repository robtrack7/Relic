import { describe, expect, it } from "vitest";
import { parseDiceExpression, rollDice } from "@/lib/dice";

describe("dice parser", () => {
  it("parses quantity, die, and modifier", () => {
    expect(parseDiceExpression("2d20+3")).toEqual({ quantity: 2, sides: 20, modifier: 3 });
    expect(parseDiceExpression("d100")).toEqual({ quantity: 1, sides: 100, modifier: 0 });
  });

  it("marks d20 criticals and fumbles", () => {
    expect(rollDice("1d20", () => 0.999).critical).toBe(true);
    expect(rollDice("1d20", () => 0).fumble).toBe(true);
  });
});
