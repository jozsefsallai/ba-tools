import "server-only";

import commonEn from "@/i18n/translations/en/common.json";
import { db } from "@/lib/db";

/**
 * Tool results reuse the API's resources, whose enums are internal names
 * (`Unarmed`, `Main`, `Outdoor`). These helpers add the in-game wording next
 * to them, so models answer with the names players know.
 */

const ENUM_SECTIONS = {
  school: "school",
  club: "club",
  attackType: "attackType",
  defenseType: "defenseType",
  combatClass: "combatClass",
  combatRole: "combatRole",
  combatPosition: "combatPosition",
  weaponType: "weaponType",
  terrain: "terrain",
  terrains: "terrain",
} as const;

export type EnumSection = (typeof ENUM_SECTIONS)[keyof typeof ENUM_SECTIONS];

const TERRAIN_GRADES = [
  "D",
  "C",
  "B",
  "A",
  "S",
  "SS",
] as const;

const ADAPTATION_KEYS = new Set([
  "streetBattleAdaptation",
  "outdoorBattleAdaptation",
  "indoorBattleAdaptation",
]);

export function enumLabels(section: EnumSection) {
  return commonEn[section] as Record<string, string>;
}

export function describeEnumLabels(section: EnumSection) {
  return Object.entries(enumLabels(section))
    .map(([value, label]) => `${value} = ${label}`)
    .join(", ");
}

function label(section: EnumSection, value: unknown) {
  return typeof value === "string"
    ? (enumLabels(section)[value] ?? value)
    : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function mapDeep(
  value: unknown,
  visit: (record: Record<string, unknown>) => Record<string, unknown>,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => mapDeep(item, visit));
  }

  if (!isRecord(value)) {
    return value;
  }

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    out[key] = mapDeep(child, visit);
  }

  return visit(out);
}

export function withEnumLabels(value: unknown) {
  return mapDeep(value, (record) => {
    const out = {
      ...record,
    };

    for (const [key, child] of Object.entries(record)) {
      if (key in ENUM_SECTIONS) {
        const section = ENUM_SECTIONS[key as keyof typeof ENUM_SECTIONS];
        const mapped = Array.isArray(child)
          ? child.map((item) => label(section, item))
          : label(section, child);

        if (JSON.stringify(mapped) !== JSON.stringify(child)) {
          out[`${key}Label`] = mapped;
        }
      }

      if (ADAPTATION_KEYS.has(key) && typeof child === "number") {
        out[`${key.replace("Adaptation", "")}Grade`] =
          TERRAIN_GRADES[
            Math.min(Math.max(child, 0), TERRAIN_GRADES.length - 1)
          ];
      }
    }

    return out;
  });
}

type GiftCount = {
  id: number;
  count: number;
  name?: string;
};

function isGiftCountList(value: unknown): value is GiftCount[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.id === "number" &&
        typeof item.count === "number" &&
        item.name === undefined,
    )
  );
}

export async function withGiftNames(value: unknown) {
  const ids = new Set<number>();

  mapDeep(value, (record) => {
    if (isGiftCountList(record.gifts)) {
      for (const gift of record.gifts) {
        ids.add(gift.id);
      }
    }

    return record;
  });

  if (ids.size === 0) {
    return value;
  }

  const gifts = await db.gift.findMany({
    where: {
      id: {
        in: [
          ...ids,
        ],
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  const names = new Map(
    gifts.map((gift) => [
      gift.id,
      gift.name,
    ]),
  );

  return mapDeep(value, (record) =>
    isGiftCountList(record.gifts)
      ? {
          ...record,
          gifts: record.gifts.map((gift) => ({
            id: gift.id,
            name: names.get(gift.id) ?? null,
            count: gift.count,
          })),
        }
      : record,
  );
}
