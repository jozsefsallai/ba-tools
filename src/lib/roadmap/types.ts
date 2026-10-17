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

export type RoadmapCategory =
  | "banner"
  | "raid"
  | "frr"
  | "event"
  | "story"
  | "bonus"
  | "birthday"
  | "shopReset"
  | "workLog"
  | "battlePass"
  | "etc";

export type EditableRoadmapKind = Exclude<
  RoadmapCategory,
  "banner" | "birthday" | "shopReset"
>;

type RoadmapItemBase = {
  id: string;
  startDate: string;
  endDate: string;
  createdAt?: string;
};

export type RoadmapBannerStudent = {
  id: string;
  name: string;
  rarity: number;
  isFestGlobal: boolean;
  isLimitedGlobal: boolean;
};

export type RoadmapBannerItem = RoadmapItemBase & {
  kind: "banner";
  name: string | null;
  freePulls: number;
  isSelectablePickup: boolean;
  students: RoadmapBannerStudent[];
};

export type RoadmapRaidRoom = {
  attackTypes: AttackType[];
  defenseTypes: DefenseType[];
  terrains: Terrain[];
  hasTorment: boolean;
  hasLunatic: boolean;
};

export type RoadmapRaidItem = RoadmapItemBase & {
  kind: "raid" | "frr";
  type: RaidType;
  raidBoss: RaidBoss | null;
  multiFloorRaidBoss: MultiFloorRaidBoss | null;
  worldRaidBoss: WorldRaidBoss | null;
  timeAttackDungeonType: TimeAttackDungeonType | null;
  attackTypes: AttackType[];
  defenseTypes: DefenseType[];
  terrains: Terrain[];
  rooms: RoadmapRaidRoom[];
};

export type RoadmapEventItem = RoadmapItemBase & {
  kind: "event";
  name: string;
  internalId: string;
  type: EventRunType;
  eventStudent: { id: string; name: string } | null;
};

export type RoadmapStoryItem = RoadmapItemBase & {
  kind: "story";
  name: string;
  internalId: string;
  type: ScenarioType;
  episodeCount: number;
};

export type RoadmapBonusItem = RoadmapItemBase & {
  kind: "bonus";
  type: BonusCampaignType;
  bonusMultiply: number;
};

export type RoadmapBirthdayItem = RoadmapItemBase & {
  kind: "birthday";
  students: RoadmapBannerStudent[];
};

export type RoadmapShopResetItem = RoadmapItemBase & {
  kind: "shopReset";
};

export type RoadmapWorkLogItem = RoadmapItemBase & {
  kind: "workLog";
  name: string;
};

export type RoadmapBattlePassItem = RoadmapItemBase & {
  kind: "battlePass";
  name: string;
};

export type RoadmapEtcItem = RoadmapItemBase & {
  kind: "etc";
  label: string;
  description: string | null;
};

export type RoadmapItem =
  | RoadmapBannerItem
  | RoadmapRaidItem
  | RoadmapEventItem
  | RoadmapStoryItem
  | RoadmapBonusItem
  | RoadmapBirthdayItem
  | RoadmapShopResetItem
  | RoadmapWorkLogItem
  | RoadmapBattlePassItem
  | RoadmapEtcItem;

export type EditableRoadmapItem = Exclude<
  RoadmapItem,
  RoadmapBannerItem | RoadmapBirthdayItem | RoadmapShopResetItem
>;
