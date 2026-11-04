import type { RaidInfo } from "@/lib/raid-info";
import type { DefenseType, RaidType } from "~prisma";

type Translate = (key: any) => string;

export const DEFENSE_COLORS: Partial<Record<DefenseType, string>> = {
  LightArmor: "bg-type-red",
  HeavyArmor: "bg-type-yellow",
  Unarmed: "bg-type-blue",
  ElasticArmor: "bg-type-purple",
  CompositeArmor: "bg-type-green",
};

export function getRaidBossLabel(
  t: Translate,
  type: RaidType,
  boss: string | null | undefined,
) {
  if (!boss) {
    return undefined;
  }

  switch (type) {
    case "Raid":
    case "EliminateRaid":
      return t(`common.raids.${boss.toLowerCase()}`);
    case "MultiFloorRaid":
      return t(`static.roadmap.multiFloorRaidBosses.${boss}`);
    case "TimeAttackDungeon":
      return t(`static.roadmap.timeAttackDungeonTypes.${boss}`);
    case "WorldRaid":
      return t(`static.roadmap.worldRaidBosses.${boss}`);
  }
}

export function buildRaidName(t: Translate, raid: RaidInfo | null | undefined) {
  if (!raid) {
    return "";
  }

  const boss = getRaidBossLabel(t, raid.type, raid.boss);

  const defense = raid.defenseTypes
    ?.map((type) => t(`common.defenseType.${type}`))
    .join(", ");

  const difficulty = raid.difficulty
    ? t(`common.difficulties.${raid.difficulty}`)
    : undefined;

  return [
    `[${t(`static.roadmap.raidTypes.${raid.type}`)}]`,
    boss,
    defense && `(${defense})`,
    difficulty,
    raid.floor !== undefined ? `F${raid.floor}` : undefined,
  ]
    .filter(Boolean)
    .join(" ");
}
