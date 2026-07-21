export type DiceRoll = {
  expression: string;
  quantity: number;
  sides: number;
  modifier: number;
  rolls: number[];
  total: number;
  critical: boolean;
  fumble: boolean;
};

export type DiceMode = "normal" | "advantage" | "disadvantage";

export type DicePoolRoll = {
  expression: string;
  total: number;
  rolls: number[];
  modifier: number;
  mode: DiceMode;
};

const allowedDice = new Set([4, 6, 8, 10, 12, 20, 100]);

const dicePattern = /^\s*(\d{0,2})d(4|6|8|10|12|20|100)\s*([+-]\s*\d{1,2})?\s*$/i;

export function parseDiceExpression(expression: string) {
  const match = dicePattern.exec(expression);
  if (!match) {
    throw new Error("Use dice like 1d20, 2d6+3, or d100.");
  }

  const quantity = Math.min(Math.max(Number(match[1] || "1"), 1), 10);
  const sides = Number(match[2]);
  const modifier = match[3] ? Number(match[3].replace(/\s+/g, "")) : 0;
  return { quantity, sides, modifier };
}

export function rollDice(expression: string, random = Math.random): DiceRoll {
  const parsed = parseDiceExpression(expression);
  const rolls = Array.from({ length: parsed.quantity }, () => Math.floor(random() * parsed.sides) + 1);
  const total = rolls.reduce((sum, value) => sum + value, parsed.modifier);

  return {
    expression,
    ...parsed,
    rolls,
    total,
    critical: parsed.sides === 20 && rolls.includes(20),
    fumble: parsed.sides === 20 && rolls.includes(1)
  };
}

export function parseDicePool(poolJson: string, modifierValue: string, modeValue: string) {
  const raw = JSON.parse(poolJson) as unknown;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 20) {
    throw new Error("Choose between 1 and 20 dice.");
  }
  const pool = raw.map(Number);
  if (pool.some((sides) => !allowedDice.has(sides))) {
    throw new Error("The dice pool contains an unsupported die.");
  }
  const modifier = Number(modifierValue || "0");
  if (!Number.isInteger(modifier) || modifier < -99 || modifier > 99) {
    throw new Error("Modifier must be a whole number from -99 to 99.");
  }
  const mode: DiceMode = modeValue === "advantage"
    ? "advantage"
    : modeValue === "disadvantage"
      ? "disadvantage"
      : "normal";
  return { pool, modifier, mode };
}

export function rollDicePool(
  pool: number[],
  modifier = 0,
  mode: DiceMode = "normal",
  random = Math.random,
): DicePoolRoll {
  const rolls: number[] = [];
  let total = modifier;

  for (const sides of pool) {
    if (!allowedDice.has(sides)) throw new Error("Unsupported die.");
    if (sides === 20 && mode !== "normal") {
      const pair = [Math.floor(random() * 20) + 1, Math.floor(random() * 20) + 1];
      const kept = mode === "advantage" ? Math.max(...pair) : Math.min(...pair);
      rolls.push(kept);
      total += kept;
    } else {
      const value = Math.floor(random() * sides) + 1;
      rolls.push(value);
      total += value;
    }
  }

  const counts = new Map<number, number>();
  pool.forEach((sides) => counts.set(sides, (counts.get(sides) ?? 0) + 1));
  const base = [...counts.entries()]
    .sort(([a], [b]) => b - a)
    .map(([sides, quantity]) => `${quantity}d${sides}`)
    .join(" + ");
  const modeLabel = pool.includes(20) && mode !== "normal" ? ` (${mode})` : "";
  const modifierLabel = modifier > 0 ? ` + ${modifier}` : modifier < 0 ? ` - ${Math.abs(modifier)}` : "";

  return {
    expression: `${base}${modifierLabel}${modeLabel}`,
    total,
    rolls,
    modifier,
    mode,
  };
}
