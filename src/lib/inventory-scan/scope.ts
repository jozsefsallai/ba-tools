import type { ScanParcelType } from "@/lib/inventory-scan/types";
import type { ItemRarity } from "~prisma";

/** The kinds of items the scanner keeps, in display order. */
export const SCAN_GROUPS = [
  "reports",
  "stones",
  "workbooks",
  "choiceBoxes",
  "weaponParts",
  "blueprints",
  "bluRays",
  "techNotes",
  "artifacts",
  "gifts",
] as const;

export type ScanGroup = (typeof SCAN_GROUPS)[number];

export type ScopedItem = {
  parcelType: ScanParcelType;
  itemId: number;
  name: string | null;
  nameJP: string | null;
  iconName: string;
  rarity: ItemRarity;
  group: ScanGroup;
  /** Items of a group with the same series are tiers of one thing */
  series: string;
  tier: number;
};

type ScopeRule = {
  group: ScanGroup;
  pattern: RegExp;
  tierOffset?: number;
};

// Matched against the icon's name; captures the series and the tier
const RULES: Record<ScanParcelType, ScopeRule[]> = {
  Item: [
    {
      group: "reports",
      pattern: /^Item_Icon_(ExpItem)_(\d)$/i,
      tierOffset: 1,
    },
    {
      group: "choiceBoxes",
      pattern: /^Equipment_Icon_(Selection)_Tier(\d+)_Piece$/i,
    },
    {
      group: "bluRays",
      pattern: /^Item_Icon_Material_ExSkill_(\w+)_([0-3])$/i,
      tierOffset: 1,
    },
    {
      group: "techNotes",
      pattern: /^Item_Icon_SkillBook_(\w+)_([0-3])$/i,
      tierOffset: 1,
    },
    {
      group: "techNotes",
      pattern: /^Item_Icon_SkillBook_(Ultimate)$/i,
    },
    {
      group: "artifacts",
      pattern: /^Item_Icon_Material_([a-z]+)_([0-3])$/i,
      tierOffset: 1,
    },
    {
      group: "workbooks",
      pattern: /^Item_Icon_WorkBook_(Potential\w+)$/i,
    },
    {
      group: "gifts",
      pattern: /^Item_Icon_Favor_(\w+)$/i,
    },
  ],
  Equipment: [
    {
      group: "stones",
      pattern: /^Equipment_Icon_(Exp)_(\d)$/i,
      tierOffset: 1,
    },
    {
      group: "weaponParts",
      pattern: /^Equipment_Icon_WeaponExpGrowth([A-Z])_(\d)$/i,
      tierOffset: 1,
    },
    {
      group: "blueprints",
      pattern: /^Equipment_Icon_([a-z]+)_Tier(\d+)_Piece$/i,
    },
    {
      // General blueprints, as tier 0
      group: "blueprints",
      pattern: /^Equipment_Icon_([a-z]+)_Useall_Piece$/i,
    },
  ],
};

// Categories items of these groups may have; chests and the like share icons
const CATEGORIES: Partial<Record<ScanGroup, string>> = {
  reports: "CharacterExpGrowth",
  choiceBoxes: "Consumable",
  bluRays: "Material",
  techNotes: "Material",
  artifacts: "Material",
  workbooks: "Material",
  gifts: "Favor",
};

export function scopeItem(item: {
  parcelType: string;
  itemId: number;
  name: string | null;
  nameJP: string | null;
  iconName: string;
  rarity: ItemRarity;
  itemCategory: string | null;
}): ScopedItem | null {
  const { parcelType } = item;

  if (parcelType !== "Item" && parcelType !== "Equipment") {
    return null;
  }

  for (const { group, pattern, tierOffset = 0 } of RULES[parcelType]) {
    const match = pattern.exec(item.iconName);

    if (!match) {
      continue;
    }

    const category = CATEGORIES[group];

    if (category && item.itemCategory !== category) {
      return null;
    }

    return {
      parcelType,
      itemId: item.itemId,
      name: item.name,
      nameJP: item.nameJP,
      iconName: item.iconName,
      rarity: item.rarity,
      group,
      series: match[1],
      tier: match[2] ? Number(match[2]) + tierOffset : 0,
    };
  }

  return null;
}
