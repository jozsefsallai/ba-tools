import {
  DEFENSE_TYPES,
  MULTI_FLOOR_RAID_BOSSES,
  RAID_BOSSES,
  RAID_TYPES,
  TERRAINS,
  TIME_ATTACK_DUNGEON_TYPES,
  WORLD_RAID_BOSSES,
} from "@/lib/roadmap/constants";
import type { RoadmapRaidItem } from "@/lib/roadmap/types";
import type { DefenseType, RaidType, Terrain } from "~prisma";

export { DEFENSE_TYPES, RAID_TYPES, TERRAINS };

export const RAID_DIFFICULTIES = [
  "Normal",
  "Hard",
  "VeryHard",
  "Hardcore",
  "Extreme",
  "Insane",
  "Torment",
  "Lunatic",
] as const;

export type RaidInfoDifficulty = (typeof RAID_DIFFICULTIES)[number];

export const ALL_RAID_INFO_BOSSES = Array.from(
  new Set<string>([
    ...RAID_BOSSES,
    ...MULTI_FLOOR_RAID_BOSSES,
    ...TIME_ATTACK_DUNGEON_TYPES,
    ...WORLD_RAID_BOSSES,
  ]),
);

export const MIN_RAID_FLOOR = 1;
export const MAX_RAID_FLOOR = 124;

export const COMMON_DEFENSE_TYPES = [
  "LightArmor",
  "HeavyArmor",
  "Unarmed",
  "ElasticArmor",
  "CompositeArmor",
] as const satisfies readonly DefenseType[];

export type RaidSeason = {
  id: string;
  startDate: string;
  endDate: string;
};

export type RaidInfo = {
  type: RaidType;
  boss?: string;
  defenseTypes?: DefenseType[];
  terrains?: Terrain[];
  difficulty?: RaidInfoDifficulty;
  floor?: number;
  season?: RaidSeason;
};

export type RaidInfoScope = "timeline" | "group";

export type RaidFilters = {
  types?: RaidType[];
  bosses?: string[];
  defenseTypes?: DefenseType[];
  terrains?: Terrain[];
  difficulties?: RaidInfoDifficulty[];
  floorMin?: number;
  floorMax?: number;
};

export function getBossOptions(type: RaidType): readonly string[] {
  switch (type) {
    case "Raid":
    case "EliminateRaid":
      return RAID_BOSSES;
    case "MultiFloorRaid":
      return MULTI_FLOOR_RAID_BOSSES;
    case "TimeAttackDungeon":
      return TIME_ATTACK_DUNGEON_TYPES;
    case "WorldRaid":
      return WORLD_RAID_BOSSES;
  }
}

export function supportsDifficulty(type: RaidType, scope: RaidInfoScope) {
  return type === "Raid" || (type === "EliminateRaid" && scope === "timeline");
}

export function supportsFloor(type: RaidType, scope: RaidInfoScope) {
  return type === "MultiFloorRaid" && scope === "timeline";
}

export function getRaidValidationError(
  raid: RaidInfo,
  scope: RaidInfoScope,
): string | null {
  if (
    raid.boss !== undefined &&
    !getBossOptions(raid.type).includes(raid.boss)
  ) {
    return `"${raid.boss}" is not a boss of raid type ${raid.type}.`;
  }

  if (raid.difficulty !== undefined && !supportsDifficulty(raid.type, scope)) {
    return `A ${scope} of raid type ${raid.type} can't have a difficulty.`;
  }

  if (raid.floor !== undefined) {
    if (!supportsFloor(raid.type, scope)) {
      return `A ${scope} of raid type ${raid.type} can't have a floor.`;
    }

    if (
      !Number.isInteger(raid.floor) ||
      raid.floor < MIN_RAID_FLOOR ||
      raid.floor > MAX_RAID_FLOOR
    ) {
      return `The floor must be a whole number from ${MIN_RAID_FLOOR} to ${MAX_RAID_FLOOR}.`;
    }
  }

  return null;
}

function inOrder<T extends string>(
  values: readonly T[] | undefined,
  order: readonly T[],
) {
  const sorted = order.filter((value) => values?.includes(value));

  return sorted.length > 0 ? sorted : undefined;
}

export function sanitizeRaid(raid: RaidInfo, scope: RaidInfoScope): RaidInfo {
  const out: RaidInfo = {
    type: raid.type,
  };

  if (
    raid.boss !== undefined &&
    getBossOptions(raid.type).includes(raid.boss)
  ) {
    out.boss = raid.boss;
  }

  const defenseTypes = inOrder(raid.defenseTypes, DEFENSE_TYPES);
  if (defenseTypes) {
    out.defenseTypes = defenseTypes;
  }

  const terrains = inOrder(raid.terrains, TERRAINS);
  if (terrains) {
    out.terrains = terrains;
  }

  if (raid.difficulty !== undefined && supportsDifficulty(raid.type, scope)) {
    out.difficulty = raid.difficulty;
  }

  if (raid.floor !== undefined && supportsFloor(raid.type, scope)) {
    out.floor = raid.floor;
  }

  if (raid.season) {
    out.season = raid.season;
  }

  return out;
}

function agreedValue<T>(values: (T | undefined)[]): T | undefined {
  const present = values.filter((value) => value !== undefined);
  const [first] = present;

  return present.every((value) => value === first) ? first : undefined;
}

export function inferGroupRaid(
  raids: (RaidInfo | null | undefined)[],
): RaidInfo | undefined {
  const tagged = raids.filter((raid): raid is RaidInfo => !!raid);
  const type = agreedValue(tagged.map((raid) => raid.type));

  if (!type) {
    return undefined;
  }

  const boss = agreedValue(tagged.map((raid) => raid.boss));
  const seasonId = agreedValue(tagged.map((raid) => raid.season?.id));

  const season = seasonId
    ? tagged.find((raid) => raid.season?.id === seasonId)?.season
    : undefined;

  return sanitizeRaid(
    {
      type,
      boss,
      defenseTypes: tagged.flatMap((raid) => raid.defenseTypes ?? []),
      terrains: tagged.flatMap((raid) => raid.terrains ?? []),
      difficulty: agreedValue(tagged.map((raid) => raid.difficulty)),
      season: season && boss ? season : undefined,
    },
    "group",
  );
}

export function resolveGroupRaid(
  explicit: RaidInfo | null | undefined,
  inferred: RaidInfo | null | undefined,
): RaidInfo | undefined {
  if (!explicit) {
    return inferred ?? undefined;
  }

  if (!inferred || inferred.type !== explicit.type) {
    return explicit;
  }

  const boss = explicit.boss ?? inferred.boss;

  return sanitizeRaid(
    {
      type: explicit.type,
      boss,
      defenseTypes: explicit.defenseTypes ?? inferred.defenseTypes,
      terrains: explicit.terrains ?? inferred.terrains,
      difficulty: explicit.difficulty ?? inferred.difficulty,
      season:
        explicit.season ??
        (boss === inferred.boss ? inferred.season : undefined),
    },
    "group",
  );
}

export function hasRaidFilters(filters: RaidFilters) {
  return (
    !!filters.types?.length ||
    !!filters.bosses?.length ||
    !!filters.defenseTypes?.length ||
    !!filters.terrains?.length ||
    !!filters.difficulties?.length ||
    filters.floorMin !== undefined ||
    filters.floorMax !== undefined
  );
}

function matchesList<T>(list: T[] | undefined, value: T | undefined) {
  return !list?.length || (value !== undefined && list.includes(value));
}

function matchesAny<T>(list: T[] | undefined, values: T[] | undefined) {
  return !list?.length || !!values?.some((value) => list.includes(value));
}

export function matchesRaidFilters(
  raid: RaidInfo | null | undefined,
  filters: RaidFilters,
) {
  if (!hasRaidFilters(filters)) {
    return true;
  }

  if (!raid) {
    return false;
  }

  if (
    !matchesList(filters.types, raid.type) ||
    !matchesList(filters.bosses, raid.boss) ||
    !matchesAny(filters.defenseTypes, raid.defenseTypes) ||
    !matchesAny(filters.terrains, raid.terrains) ||
    !matchesList(filters.difficulties, raid.difficulty)
  ) {
    return false;
  }

  if (filters.floorMin !== undefined || filters.floorMax !== undefined) {
    return (
      raid.floor !== undefined &&
      raid.floor >= (filters.floorMin ?? MIN_RAID_FLOOR) &&
      raid.floor <= (filters.floorMax ?? MAX_RAID_FLOOR)
    );
  }

  return true;
}

export function getRoadmapRaidBoss(item: RoadmapRaidItem) {
  switch (item.type) {
    case "Raid":
    case "EliminateRaid":
      return item.raidBoss ?? undefined;
    case "MultiFloorRaid":
      return item.multiFloorRaidBoss ?? undefined;
    case "TimeAttackDungeon":
      return item.timeAttackDungeonType ?? undefined;
    case "WorldRaid":
      return item.worldRaidBoss ?? undefined;
  }
}

export function getRaidDefenseOptions(item: RoadmapRaidItem): DefenseType[] {
  const roomTypes = item.rooms.flatMap((room) => room.defenseTypes);

  return Array.from(
    new Set(roomTypes.length > 0 ? roomTypes : item.defenseTypes),
  );
}

export function getRaidTerrainOptions(item: RoadmapRaidItem): Terrain[] {
  return Array.from(
    new Set([
      ...item.terrains,
      ...item.rooms.flatMap((room) => room.terrains),
    ]),
  );
}

export function raidFromRoadmapItem(
  item: RoadmapRaidItem,
  scope: RaidInfoScope,
): RaidInfo {
  const defenseTypes = getRaidDefenseOptions(item);

  const isRoomChoice =
    item.type === "EliminateRaid" &&
    scope === "timeline" &&
    defenseTypes.length > 1;

  return sanitizeRaid(
    {
      type: item.type,
      boss: getRoadmapRaidBoss(item),
      defenseTypes: isRoomChoice ? undefined : defenseTypes,
      terrains: getRaidTerrainOptions(item),
      season: {
        id: item.id,
        startDate: item.startDate,
        endDate: item.endDate,
      },
    },
    scope,
  );
}

function sameValues<T>(a: T[] | undefined, b: T[] | undefined) {
  return (a ?? []).join() === (b ?? []).join();
}

export function compareRaids(
  a: RaidInfo | null | undefined,
  b: RaidInfo | null | undefined,
) {
  return (
    a?.type === b?.type &&
    a?.boss === b?.boss &&
    sameValues(a?.defenseTypes, b?.defenseTypes) &&
    sameValues(a?.terrains, b?.terrains) &&
    a?.difficulty === b?.difficulty &&
    a?.floor === b?.floor &&
    a?.season?.id === b?.season?.id
  );
}
