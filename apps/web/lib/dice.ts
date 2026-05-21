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
