import type {
  AttackType,
  CombatClass,
  CombatPosition,
  CombatRole,
  DefenseType,
  School,
  Student,
  WeaponType,
} from "~prisma";

export const SCHOOLS: School[] = [
  "Abydos",
  "Gehenna",
  "Millennium",
  "Trinity",
  "Hyakkiyako",
  "Shanhaijing",
  "RedWinter",
  "Valkyrie",
  "Arius",
  "SRT",
  "Highlander",
  "WildHunt",
  "Odyssey",
  "Tokiwadai",
  "Sakugawa",
  "ETC",
];

export const ATTACK_TYPES: AttackType[] = [
  "Explosion",
  "Pierce",
  "Mystic",
  "Sonic",
  "Chemical",
];

export const DEFENSE_TYPES: DefenseType[] = [
  "LightArmor",
  "HeavyArmor",
  "Unarmed",
  "ElasticArmor",
  "CompositeArmor",
];

export const COMBAT_ROLES: CombatRole[] = [
  "DamageDealer",
  "Tanker",
  "Healer",
  "Supporter",
  "Vehicle",
];

export const COMBAT_CLASSES: CombatClass[] = ["Main", "Support"];

export const COMBAT_POSITIONS: CombatPosition[] = ["Front", "Middle", "Back"];

export const WEAPON_TYPES: WeaponType[] = [
  "AR",
  "SMG",
  "HG",
  "SG",
  "MG",
  "SR",
  "GL",
  "RL",
  "RG",
  "MT",
  "FT",
];

export const RARITIES = [3, 2, 1] as const;

export const GAME_SERVER_KEYS = ["jp", "global", "cn"] as const;
export type GameServerKey = (typeof GAME_SERVER_KEYS)[number];

export const ACQUISITION_KINDS = [
  "permanent",
  "limited",
  "fest",
  "welfare",
  "archive",
] as const;
export type AcquisitionKind = (typeof ACQUISITION_KINDS)[number];

const TYPE_COLOR_CLASSES = {
  red: "bg-type-red",
  yellow: "bg-type-yellow",
  blue: "bg-type-blue",
  purple: "bg-type-purple",
  green: "bg-type-green",
  neutral: "bg-muted-foreground",
} as const;

export function getAttackTypeColorClass(attackType: AttackType) {
  switch (attackType) {
    case "Explosion":
      return TYPE_COLOR_CLASSES.red;
    case "Pierce":
      return TYPE_COLOR_CLASSES.yellow;
    case "Mystic":
      return TYPE_COLOR_CLASSES.blue;
    case "Sonic":
      return TYPE_COLOR_CLASSES.purple;
    case "Chemical":
      return TYPE_COLOR_CLASSES.green;
    default:
      return TYPE_COLOR_CLASSES.neutral;
  }
}

export function getDefenseTypeColorClass(defenseType: DefenseType) {
  switch (defenseType) {
    case "LightArmor":
      return TYPE_COLOR_CLASSES.red;
    case "HeavyArmor":
      return TYPE_COLOR_CLASSES.yellow;
    case "Unarmed":
      return TYPE_COLOR_CLASSES.blue;
    case "ElasticArmor":
      return TYPE_COLOR_CLASSES.purple;
    case "CompositeArmor":
      return TYPE_COLOR_CLASSES.green;
    default:
      return TYPE_COLOR_CLASSES.neutral;
  }
}

export const TERRAINS = [
  { key: "Street", field: "streetBattleAdaptation" },
  { key: "Outdoor", field: "outdoorBattleAdaptation" },
  { key: "Indoor", field: "indoorBattleAdaptation" },
] as const;

export const EQUIPMENT_KINDS: Student["equipment"][number][] = [
  "Hat",
  "Gloves",
  "Shoes",
  "Bag",
  "Badge",
  "Hairpin",
  "Charm",
  "Watch",
  "Necklace",
];

type AvailabilityFields = Pick<
  Student,
  | "isReleasedJP"
  | "isReleasedGlobal"
  | "isReleasedCN"
  | "isLimitedJP"
  | "isLimitedGlobal"
  | "isLimitedCN"
  | "isFestJP"
  | "isFestGlobal"
  | "isFestCN"
  | "isWelfareJP"
  | "isWelfareGlobal"
  | "isWelfareCN"
  | "isArchiveJP"
  | "isArchiveGlobal"
  | "isArchiveCN"
>;

const SERVER_SUFFIX = {
  jp: "JP",
  global: "Global",
  cn: "CN",
} as const satisfies Record<GameServerKey, string>;

export function isReleasedOn(
  student: AvailabilityFields,
  server: GameServerKey,
) {
  return student[`isReleased${SERVER_SUFFIX[server]}`];
}

export function hasBondGearOn(
  student: Pick<
    Student,
    "hasBondGearJP" | "hasBondGearGlobal" | "hasBondGearCN"
  >,
  server: GameServerKey,
) {
  return student[`hasBondGear${SERVER_SUFFIX[server]}`];
}

export function getAcquisitionKind(
  student: AvailabilityFields,
  server: GameServerKey,
): AcquisitionKind {
  const suffix = SERVER_SUFFIX[server];

  if (student[`isFest${suffix}`]) {
    return "fest";
  }

  if (student[`isArchive${suffix}`]) {
    return "archive";
  }

  if (student[`isLimited${suffix}`]) {
    return "limited";
  }

  if (student[`isWelfare${suffix}`]) {
    return "welfare";
  }

  return "permanent";
}

type LocalizedNameFields = Pick<
  Student,
  "name" | "nameJP" | "firstName" | "firstNameJP" | "lastName" | "lastNameJP"
>;

export function getLocalizedStudentNames(
  student: LocalizedNameFields,
  locale: string,
) {
  if (locale === "ja") {
    return {
      name: student.nameJP || student.name,
      firstName: student.firstNameJP || student.firstName,
      lastName: student.lastNameJP || student.lastName,
    };
  }

  return {
    name: student.name,
    firstName: student.firstName,
    lastName: student.lastName,
  };
}
