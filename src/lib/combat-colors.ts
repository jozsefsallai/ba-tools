import { z } from "zod";
import type { AttackType, DefenseType } from "~prisma";

export const COMBAT_COLORS = [
  "red",
  "yellow",
  "blue",
  "purple",
  "green",
] as const;

export type CombatColor = (typeof COMBAT_COLORS)[number];

const ATTACK_TYPE_COLORS = {
  red: "Explosion",
  yellow: "Pierce",
  blue: "Mystic",
  purple: "Sonic",
  green: "Chemical",
} as const satisfies Record<CombatColor, AttackType>;

const DEFENSE_TYPE_COLORS = {
  red: "LightArmor",
  yellow: "HeavyArmor",
  blue: "Unarmed",
  purple: "ElasticArmor",
  green: "CompositeArmor",
} as const satisfies Record<CombatColor, DefenseType>;

function describeColors(colors: Record<CombatColor, string>) {
  return COMBAT_COLORS.map((color) => `${color} = ${colors[color]}`).join(", ");
}

export const ATTACK_TYPE_COLOR_DOC = `Also accepts colors: ${describeColors(ATTACK_TYPE_COLORS)}.`;
export const DEFENSE_TYPE_COLOR_DOC = `Also accepts colors: ${describeColors(DEFENSE_TYPE_COLORS)}.`;

function isColor(value: string): value is CombatColor {
  return (COMBAT_COLORS as readonly string[]).includes(value);
}

export function resolveAttackType<T extends string>(value: T) {
  return (isColor(value) ? ATTACK_TYPE_COLORS[value] : value) as Exclude<
    T,
    CombatColor
  >;
}

export function resolveDefenseType<T extends string>(value: T) {
  return (isColor(value) ? DEFENSE_TYPE_COLORS[value] : value) as Exclude<
    T,
    CombatColor
  >;
}

export function colorEnum<T extends string>(values: readonly T[]) {
  return z.enum([
    ...values,
    ...COMBAT_COLORS,
  ] as readonly (T | CombatColor)[]);
}

export function withRaidTypesResolved<T extends Record<string, unknown>>(
  input: T,
): T {
  const raid = input.raid as {
    defenseTypes?: unknown;
  } | null;

  if (!raid || !Array.isArray(raid.defenseTypes)) {
    return input;
  }

  return {
    ...input,
    raid: {
      ...raid,
      defenseTypes: Array.from(
        new Set(raid.defenseTypes.map(resolveDefenseType)),
      ),
    },
  };
}
