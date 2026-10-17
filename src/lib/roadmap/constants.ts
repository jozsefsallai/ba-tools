import type {
  EditableRoadmapKind,
  RoadmapCategory,
  RoadmapItem,
} from "@/lib/roadmap/types";
import type {
  AttackType,
  BonusCampaignType,
  DefenseType,
  EventRunType,
  MultiFloorRaidBoss,
  RaidBoss,
  RaidType,
  ScenarioType,
  Terrain,
  TimeAttackDungeonType,
  WorldRaidBoss,
} from "~prisma";

export const RAID_TYPES = [
  "Raid",
  "EliminateRaid",
  "MultiFloorRaid",
  "TimeAttackDungeon",
  "WorldRaid",
] as const satisfies readonly RaidType[];

export const RAID_BOSSES = [
  "Binah",
  "Chesed",
  "ShiroKuro",
  "Hieronymus",
  "KAITEN",
  "Perorodzilla",
  "Hod",
  "Goz",
  "Gregorius",
  "Hovercraft",
  "Kurokage",
  "Geburah",
  "Yesod",
  "Drumbarka",
] as const satisfies readonly RaidBoss[];

export const MULTI_FLOOR_RAID_BOSSES = [
  "TheFuryOfSet",
  "Chokmah",
  "Tiphareth",
] as const satisfies readonly MultiFloorRaidBoss[];

export const WORLD_RAID_BOSSES = [
  "WakamoSwimsuit",
  "WakamoHovercraft",
  "BinahColor",
  "ChesedColor",
  "ShiroKuroColor",
  "HieronymusColor",
  "HodColor",
  "PerorodzillaColor",
  "ShirokoTerror",
  "Binah",
  "Chesed",
  "Hod",
  "Kether",
  "Tiphareth",
  "Geburah",
  "Chokmah",
  "Yesod",
  "Malkuth",
  "Decagrammaton",
] as const satisfies readonly WorldRaidBoss[];

export const TIME_ATTACK_DUNGEON_TYPES = [
  "Defense",
  "Shooting",
  "Destruction",
  "Escort",
] as const satisfies readonly TimeAttackDungeonType[];

export const ATTACK_TYPES = [
  "Explosion",
  "Pierce",
  "Mystic",
  "Sonic",
  "Chemical",
  "Normal",
  "Mixed",
] as const satisfies readonly AttackType[];

export const DEFENSE_TYPES = [
  "LightArmor",
  "HeavyArmor",
  "Unarmed",
  "ElasticArmor",
  "CompositeArmor",
  "Normal",
  "Mixed",
] as const satisfies readonly DefenseType[];

export const TERRAINS = [
  "Street",
  "Outdoor",
  "Indoor",
] as const satisfies readonly Terrain[];

export const BONUS_CAMPAIGN_TYPES = [
  "NormalMission",
  "HardMission",
  "WeekDungeon",
  "WeekDungeonChaser",
  "SchoolDungeon",
  "Schedule",
  "AccountExperience",
] as const satisfies readonly BonusCampaignType[];

export const SCENARIO_TYPES = [
  "Main",
  "Sub",
  "Mini",
  "SpecialOperation",
] as const satisfies readonly ScenarioType[];

export const EVENT_RUN_TYPES = [
  "Initial",
  "Reprint",
  "Permanent",
] as const satisfies readonly EventRunType[];

export const PERMANENT_END_DATE = "2099-12-31T23:59:59.000Z";

const FOUR_YEARS_MS = 4 * 365.25 * 24 * 60 * 60 * 1000;

export const DAY_MS = 24 * 60 * 60 * 1000;

export const SHOP_RESET_HOUR_UTC = 4;

export function isPermanent(
  startDate: string | Date,
  endDate: string | Date,
): boolean {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  return (
    end >= new Date(PERMANENT_END_DATE).getTime() || end - start > FOUR_YEARS_MS
  );
}

export const ROADMAP_CATEGORIES: RoadmapCategory[] = [
  "banner",
  "raid",
  "frr",
  "event",
  "story",
  "bonus",
  "birthday",
  "shopReset",
  "workLog",
  "battlePass",
  "etc",
];

export const EDITABLE_ROADMAP_KINDS: EditableRoadmapKind[] = [
  "raid",
  "frr",
  "event",
  "story",
  "bonus",
  "workLog",
  "battlePass",
  "etc",
];

export function isEditableKind(kind: string): kind is EditableRoadmapKind {
  return (EDITABLE_ROADMAP_KINDS as string[]).includes(kind);
}

/** Lane height (px) per category in the timeline view. */
export const LANE_HEIGHTS: Record<RoadmapCategory, number> = {
  banner: 72,
  raid: 72,
  frr: 60,
  event: 60,
  story: 60,
  bonus: 48,
  birthday: 48,
  shopReset: 40,
  workLog: 48,
  battlePass: 48,
  etc: 60,
};

export type RoadmapSwatch = {
  bar: string;
  dot: string;
  badge: string;
};

function swatch(color: string): RoadmapSwatch {
  return SWATCHES[color];
}

// Tailwind needs to see full class names, so every swatch is spelled out.
const SWATCHES: Record<string, RoadmapSwatch> = {
  sky: {
    bar: "bg-sky-100 border-sky-400 text-sky-950 dark:bg-sky-950/70 dark:border-sky-600 dark:text-sky-50",
    dot: "bg-sky-500",
    badge: "bg-sky-500/15 text-sky-800 dark:text-sky-200 border-sky-500/40",
  },
  rose: {
    bar: "bg-rose-100 border-rose-400 text-rose-950 dark:bg-rose-950/70 dark:border-rose-600 dark:text-rose-50",
    dot: "bg-rose-500",
    badge: "bg-rose-500/15 text-rose-800 dark:text-rose-200 border-rose-500/40",
  },
  red: {
    bar: "bg-red-100 border-red-400 text-red-950 dark:bg-red-950/70 dark:border-red-600 dark:text-red-50",
    dot: "bg-red-500",
    badge: "bg-red-500/15 text-red-800 dark:text-red-200 border-red-500/40",
  },
  orange: {
    bar: "bg-orange-100 border-orange-400 text-orange-950 dark:bg-orange-950/70 dark:border-orange-600 dark:text-orange-50",
    dot: "bg-orange-500",
    badge:
      "bg-orange-500/15 text-orange-800 dark:text-orange-200 border-orange-500/40",
  },
  amber: {
    bar: "bg-amber-100 border-amber-400 text-amber-950 dark:bg-amber-950/70 dark:border-amber-600 dark:text-amber-50",
    dot: "bg-amber-500",
    badge:
      "bg-amber-500/15 text-amber-800 dark:text-amber-200 border-amber-500/40",
  },
  lime: {
    bar: "bg-lime-100 border-lime-500 text-lime-950 dark:bg-lime-950/70 dark:border-lime-600 dark:text-lime-50",
    dot: "bg-lime-500",
    badge: "bg-lime-500/15 text-lime-800 dark:text-lime-200 border-lime-500/40",
  },
  emerald: {
    bar: "bg-emerald-100 border-emerald-400 text-emerald-950 dark:bg-emerald-950/70 dark:border-emerald-600 dark:text-emerald-50",
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border-emerald-500/40",
  },
  teal: {
    bar: "bg-teal-100 border-teal-400 text-teal-950 dark:bg-teal-950/70 dark:border-teal-600 dark:text-teal-50",
    dot: "bg-teal-500",
    badge: "bg-teal-500/15 text-teal-800 dark:text-teal-200 border-teal-500/40",
  },
  cyan: {
    bar: "bg-cyan-100 border-cyan-400 text-cyan-950 dark:bg-cyan-950/70 dark:border-cyan-600 dark:text-cyan-50",
    dot: "bg-cyan-500",
    badge: "bg-cyan-500/15 text-cyan-800 dark:text-cyan-200 border-cyan-500/40",
  },
  blue: {
    bar: "bg-blue-100 border-blue-400 text-blue-950 dark:bg-blue-950/70 dark:border-blue-600 dark:text-blue-50",
    dot: "bg-blue-500",
    badge: "bg-blue-500/15 text-blue-800 dark:text-blue-200 border-blue-500/40",
  },
  indigo: {
    bar: "bg-indigo-100 border-indigo-400 text-indigo-950 dark:bg-indigo-950/70 dark:border-indigo-600 dark:text-indigo-50",
    dot: "bg-indigo-500",
    badge:
      "bg-indigo-500/15 text-indigo-800 dark:text-indigo-200 border-indigo-500/40",
  },
  violet: {
    bar: "bg-violet-100 border-violet-400 text-violet-950 dark:bg-violet-950/70 dark:border-violet-600 dark:text-violet-50",
    dot: "bg-violet-500",
    badge:
      "bg-violet-500/15 text-violet-800 dark:text-violet-200 border-violet-500/40",
  },
  fuchsia: {
    bar: "bg-fuchsia-100 border-fuchsia-400 text-fuchsia-950 dark:bg-fuchsia-950/70 dark:border-fuchsia-600 dark:text-fuchsia-50",
    dot: "bg-fuchsia-500",
    badge:
      "bg-fuchsia-500/15 text-fuchsia-800 dark:text-fuchsia-200 border-fuchsia-500/40",
  },
  pink: {
    bar: "bg-pink-100 border-pink-400 text-pink-950 dark:bg-pink-950/70 dark:border-pink-600 dark:text-pink-50",
    dot: "bg-pink-500",
    badge: "bg-pink-500/15 text-pink-800 dark:text-pink-200 border-pink-500/40",
  },
  slate: {
    bar: "bg-slate-100 border-slate-400 text-slate-950 dark:bg-slate-800/70 dark:border-slate-500 dark:text-slate-50",
    dot: "bg-slate-500",
    badge:
      "bg-slate-500/15 text-slate-800 dark:text-slate-200 border-slate-500/40",
  },
  fest: {
    bar: "bg-amber-50 border-amber-500 border-2 text-amber-950 shadow-[0_0_10px_-2px] shadow-amber-400/70 dark:bg-amber-950/60 dark:border-amber-400 dark:text-amber-50",
    dot: "bg-amber-400",
    badge:
      "bg-amber-400/20 text-amber-900 dark:text-amber-100 border-amber-500/60",
  },
  limited: {
    bar: "bg-violet-50 border-violet-500 border-2 text-violet-950 dark:bg-violet-950/60 dark:border-violet-400 dark:text-violet-50",
    dot: "bg-violet-500",
    badge:
      "bg-violet-500/15 text-violet-800 dark:text-violet-200 border-violet-500/50",
  },
  yellow: {
    bar: "bg-yellow-100 border-yellow-500 text-yellow-950 dark:bg-yellow-950/70 dark:border-yellow-600 dark:text-yellow-50",
    dot: "bg-yellow-500",
    badge:
      "bg-yellow-500/15 text-yellow-800 dark:text-yellow-200 border-yellow-500/40",
  },
};

const CATEGORY_COLORS: Record<RoadmapCategory, string> = {
  banner: "sky",
  raid: "rose",
  frr: "violet",
  event: "emerald",
  story: "indigo",
  bonus: "amber",
  birthday: "pink",
  shopReset: "slate",
  workLog: "teal",
  battlePass: "fuchsia",
  etc: "slate",
};

const RAID_TYPE_COLORS: Record<RaidType, string> = {
  Raid: "rose",
  EliminateRaid: "red",
  TimeAttackDungeon: "orange",
  MultiFloorRaid: "violet",
  WorldRaid: "pink",
};

const EVENT_TYPE_COLORS: Record<EventRunType, string> = {
  Initial: "emerald",
  Reprint: "lime",
  Permanent: "teal",
};

const SCENARIO_TYPE_COLORS: Record<ScenarioType, string> = {
  Main: "indigo",
  Sub: "blue",
  Mini: "cyan",
  SpecialOperation: "violet",
};

const BONUS_TYPE_COLORS: Record<BonusCampaignType, string> = {
  NormalMission: "amber",
  HardMission: "orange",
  WeekDungeon: "yellow",
  WeekDungeonChaser: "lime",
  SchoolDungeon: "teal",
  Schedule: "pink",
  AccountExperience: "cyan",
};

export function getCategorySwatch(category: RoadmapCategory): RoadmapSwatch {
  return swatch(CATEGORY_COLORS[category]);
}

export function isFestBanner(item: RoadmapItem): boolean {
  return (
    item.kind === "banner" &&
    !item.isSelectablePickup &&
    item.students.some((student) => student.isFestGlobal)
  );
}

export function isLimitedBanner(item: RoadmapItem): boolean {
  return (
    item.kind === "banner" &&
    !isFestBanner(item) &&
    item.students.some((student) => student.isLimitedGlobal)
  );
}

export function getItemSwatch(item: RoadmapItem): RoadmapSwatch {
  switch (item.kind) {
    case "banner":
      if (isFestBanner(item)) {
        return swatch("fest");
      }
      return isLimitedBanner(item)
        ? swatch("limited")
        : getCategorySwatch("banner");
    case "raid":
    case "frr":
      return swatch(RAID_TYPE_COLORS[item.type]);
    case "event":
      return swatch(EVENT_TYPE_COLORS[item.type]);
    case "story":
      return swatch(SCENARIO_TYPE_COLORS[item.type]);
    case "bonus":
      return swatch(BONUS_TYPE_COLORS[item.type]);
    default:
      return getCategorySwatch(item.kind);
  }
}

export function getItemSubtype(item: RoadmapItem): string | null {
  switch (item.kind) {
    case "raid":
    case "event":
    case "story":
    case "bonus":
      return item.type;
    default:
      return null;
  }
}
