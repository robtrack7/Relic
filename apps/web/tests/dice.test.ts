import { describe, expect, it } from "vitest";
import { parseDiceExpression, parseDicePool, rollDice, rollDicePool } from "@/lib/dice";

describe("dice parser", () => {
  it("parses quantity, die, and modifier", () => {
    expect(parseDiceExpression("2d20+3")).toEqual({ quantity: 2, sides: 20, modifier: 3 });
    expect(parseDiceExpression("d100")).toEqual({ quantity: 1, sides: 100, modifier: 0 });
  });

  it("marks d20 criticals and fumbles", () => {
    expect(rollDice("1d20", () => 0.999).critical).toBe(true);
    expect(rollDice("1d20", () => 0).fumble).toBe(true);
  });

  it("validates and rolls mixed pools with d20 advantage", () => {
    expect(parseDicePool("[20,20,6]", "3", "advantage")).toEqual({
      pool: [20, 20, 6], modifier: 3, mode: "advantage"
    });
    const roll = rollDicePool([20, 6], 2, "advantage", () => 0.5);
    expect(roll.expression).toBe("1d20 + 1d6 + 2 (advantage)");
    expect(roll.rolls).toEqual([11, 4]);
    expect(roll.total).toBe(17);
  });

  it("keeps normal, advantage, and disadvantage explicit in d20 pool results", () => {
    expect(rollDicePool([20], 0, "normal", () => 0.75)).toMatchObject({
      expression: "1d20",
      rolls: [16],
      total: 16,
      mode: "normal"
    });
    expect(rollDicePool([20], 0, "advantage", (() => {
      const values = [0.1, 0.8];
      return () => values.shift() ?? 0;
    })())).toMatchObject({ expression: "1d20 (advantage)", rolls: [17], total: 17, mode: "advantage" });
    expect(rollDicePool([20], 0, "disadvantage", (() => {
      const values = [0.1, 0.8];
      return () => values.shift() ?? 0;
    })())).toMatchObject({ expression: "1d20 (disadvantage)", rolls: [3], total: 3, mode: "disadvantage" });
  });
});
