import "server-only";

import { db } from "@/lib/db";
import { GAME_BANNERS_CACHE_TAG } from "@/lib/game-banners.server";
import { PERMANENT_END_DATE, isPermanent } from "@/lib/roadmap/constants";
import { startOfUTCDay } from "@/lib/roadmap/layout";
import type { AnyRoadmapInput, RoadmapInput } from "@/lib/roadmap/schemas";
import type {
  EditableRoadmapItem,
  EditableRoadmapKind,
  RoadmapBannerItem,
  RoadmapItem,
  RoadmapRaidItem,
} from "@/lib/roadmap/types";
import { revalidateTag, unstable_cache } from "next/cache";
import type {
  BattlePassCampaign,
  BonusCampaign,
  EliminateRaidRoom,
  Event,
  Prisma,
  Raid,
  RoadmapETC,
  Scenario,
  Student,
  WorkLogCampaign,
} from "~prisma";

export const ROADMAP_CACHE_TAG = "roadmap";

export function invalidateRoadmapCache() {
  revalidateTag(ROADMAP_CACHE_TAG, { expire: 0 });
}

export class RoadmapError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const RAID_INCLUDE = {
  eliminateRaidRooms: { orderBy: { id: "asc" } },
} as const;

const EVENT_INCLUDE = {
  eventStudent: { select: { id: true, name: true } },
} as const;

function serializeDates(row: {
  id: string;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}) {
  return {
    id: row.id,
    startDate: row.startDate.toISOString(),
    endDate: row.endDate.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function serializeRaid(
  raid: Raid & { eliminateRaidRooms: EliminateRaidRoom[] },
): RoadmapRaidItem {
  return {
    ...serializeDates(raid),
    kind: raid.type === "MultiFloorRaid" ? "frr" : "raid",
    type: raid.type,
    raidBoss: raid.raidBoss,
    multiFloorRaidBoss: raid.multiFloorRaidBoss,
    worldRaidBoss: raid.worldRaidBoss,
    timeAttackDungeonType: raid.timeAttackDungeonType,
    attackTypes: raid.attackTypes,
    defenseTypes: raid.defenseTypes,
    terrains: raid.terrains,
    rooms: raid.eliminateRaidRooms.map((room) => ({
      attackTypes: room.attackTypes,
      defenseTypes: room.defenseTypes,
      terrains: room.terrains,
      hasTorment: room.hasTorment,
      hasLunatic: room.hasLunatic,
    })),
  };
}

function serializeEvent(
  event: Event & { eventStudent: Pick<Student, "id" | "name"> | null },
): EditableRoadmapItem {
  return {
    ...serializeDates(event),
    kind: "event",
    name: event.name,
    internalId: event.internalId,
    type: event.type,
    eventStudent: event.eventStudent,
  };
}

function serializeStory(scenario: Scenario): EditableRoadmapItem {
  return {
    ...serializeDates(scenario),
    kind: "story",
    name: scenario.name,
    internalId: scenario.internalId,
    type: scenario.type,
    episodeCount: scenario.episodeCount,
  };
}

function serializeBonus(campaign: BonusCampaign): EditableRoadmapItem {
  return {
    ...serializeDates(campaign),
    kind: "bonus",
    type: campaign.type,
    bonusMultiply: campaign.bonusMultiply,
  };
}

function serializeWorkLog(campaign: WorkLogCampaign): EditableRoadmapItem {
  return { ...serializeDates(campaign), kind: "workLog", name: campaign.name };
}

function serializeBattlePass(
  campaign: BattlePassCampaign,
): EditableRoadmapItem {
  return {
    ...serializeDates(campaign),
    kind: "battlePass",
    name: campaign.name,
  };
}

function serializeEtc(etc: RoadmapETC): EditableRoadmapItem {
  return {
    ...serializeDates(etc),
    kind: "etc",
    label: etc.label,
    description: etc.description,
  };
}

const FOUR_YEARS_FROM = (date: Date) => {
  const d = new Date(date);
  d.setUTCFullYear(d.getUTCFullYear() + 4);
  return d;
};

const GA_TICKET_LOOKBACK = () => {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - 2, 1);
  return d;
};

function upcomingWhere() {
  const now = new Date();
  const today = startOfUTCDay(now);

  return {
    endDate: { gt: now },
    OR: [
      { startDate: { gte: today } },
      { endDate: { lt: FOUR_YEARS_FROM(now) } },
    ],
  };
}

async function fetchBanners(): Promise<RoadmapBannerItem[]> {
  const banners = await db.gameBanner.findMany({
    where: { endDate: { gt: new Date() } },
    orderBy: { startDate: "asc" },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      freePulls: true,
      isSelectablePickup: true,
      pickupStudents: {
        select: {
          id: true,
          name: true,
          rarity: true,
          isFestGlobal: true,
          isLimitedGlobal: true,
        },
      },
    },
  });

  return banners.map((banner) => ({
    ...serializeDates(banner),
    kind: "banner",
    name: banner.name,
    freePulls: banner.freePulls,
    isSelectablePickup: banner.isSelectablePickup,
    students: banner.pickupStudents,
  }));
}

export async function fetchRoadmapItems(): Promise<RoadmapItem[]> {
  const where = upcomingWhere();
  const orderBy = { startDate: "asc" } as const;

  const [banners, raids, events, scenarios, bonuses, workLogs, passes, etcs] =
    await Promise.all([
      fetchBanners(),
      db.raid.findMany({
        // recently ended Grand Assaults are kept for their GA tickets
        where: {
          OR: [
            where,
            { type: "EliminateRaid", endDate: { gt: GA_TICKET_LOOKBACK() } },
          ],
        },
        orderBy,
        include: RAID_INCLUDE,
      }),
      db.event.findMany({ where, orderBy, include: EVENT_INCLUDE }),
      db.scenario.findMany({ where, orderBy }),
      db.bonusCampaign.findMany({ where, orderBy }),
      db.workLogCampaign.findMany({ where, orderBy }),
      db.battlePassCampaign.findMany({ where, orderBy }),
      db.roadmapETC.findMany({ where, orderBy }),
    ]);

  return [
    ...banners,
    ...raids.map(serializeRaid),
    ...events.map(serializeEvent),
    ...scenarios.map(serializeStory),
    ...bonuses.map(serializeBonus),
    ...workLogs.map(serializeWorkLog),
    ...passes.map(serializeBattlePass),
    ...etcs.map(serializeEtc),
  ];
}

export const getCachedRoadmapItems = unstable_cache(
  fetchRoadmapItems,
  ["public-roadmap"],
  {
    revalidate: 3_600,
    tags: [ROADMAP_CACHE_TAG, GAME_BANNERS_CACHE_TAG],
  },
);

type DatedRow = { id: string; startDate: Date; endDate: Date };

type RoadmapDelegate = {
  create(args: {
    data: object;
    include?: object;
  }): Prisma.PrismaPromise<unknown>;
  update(args: {
    where: { id: string };
    data: object;
    include?: object;
  }): Prisma.PrismaPromise<unknown>;
  delete(args: { where: { id: string } }): Prisma.PrismaPromise<unknown>;
  findUnique(args: {
    where: { id: string };
  }): Prisma.PrismaPromise<(DatedRow & { type?: string }) | null>;
  findMany(args: {
    where: { id: { in: string[] } };
    include?: object;
  }): Prisma.PrismaPromise<DatedRow[]>;
};

type RoadmapModel = {
  delegate: () => RoadmapDelegate;
  include?: object;
  serialize: (row: never) => EditableRoadmapItem;
};

function delegate(model: unknown) {
  return model as RoadmapDelegate;
}

const raidModel: RoadmapModel = {
  delegate: () => delegate(db.raid),
  include: RAID_INCLUDE,
  serialize: serializeRaid,
};

const MODELS: Record<EditableRoadmapKind, RoadmapModel> = {
  raid: raidModel,
  frr: raidModel,
  event: {
    delegate: () => delegate(db.event),
    include: EVENT_INCLUDE,
    serialize: serializeEvent,
  },
  story: { delegate: () => delegate(db.scenario), serialize: serializeStory },
  bonus: {
    delegate: () => delegate(db.bonusCampaign),
    serialize: serializeBonus,
  },
  workLog: {
    delegate: () => delegate(db.workLogCampaign),
    serialize: serializeWorkLog,
  },
  battlePass: {
    delegate: () => delegate(db.battlePassCampaign),
    serialize: serializeBattlePass,
  },
  etc: { delegate: () => delegate(db.roadmapETC), serialize: serializeEtc },
};

function serialize(kind: EditableRoadmapKind, row: unknown) {
  return MODELS[kind].serialize(row as never);
}

function isRaidKind(kind: EditableRoadmapKind): kind is "raid" | "frr" {
  return kind === "raid" || kind === "frr";
}

function assertRaidKind(kind: "raid" | "frr", type: string) {
  if ((type === "MultiFloorRaid") !== (kind === "frr")) {
    throw new RoadmapError(
      kind === "frr"
        ? "Final Restriction Release items must be MultiFloorRaid"
        : "MultiFloorRaid items must use the frr kind",
    );
  }
}

function toData(
  kind: EditableRoadmapKind,
  input: Partial<AnyRoadmapInput>,
  mode: "create" | "update",
): object {
  if (!isRaidKind(kind)) {
    return input;
  }

  const { rooms, ...rest } = input as Partial<RoadmapInput<"raid">>;
  const type = rest.type;

  if (type) {
    assertRaidKind(kind, type);

    // only keep the boss field that matches the raid type
    rest.raidBoss =
      type === "Raid" || type === "EliminateRaid"
        ? (rest.raidBoss ?? null)
        : null;
    rest.multiFloorRaidBoss =
      type === "MultiFloorRaid" ? (rest.multiFloorRaidBoss ?? null) : null;
    rest.worldRaidBoss =
      type === "WorldRaid" ? (rest.worldRaidBoss ?? null) : null;
    rest.timeAttackDungeonType =
      type === "TimeAttackDungeon"
        ? (rest.timeAttackDungeonType ?? null)
        : null;
  }

  if (!rooms) {
    return rest;
  }

  // rooms only exist on Grand Assault
  const nextRooms = type && type !== "EliminateRaid" ? [] : rooms;

  return {
    ...rest,
    eliminateRaidRooms:
      mode === "create"
        ? { create: nextRooms }
        : { deleteMany: {}, create: nextRooms },
  };
}

function assertDates(startDate: Date | string, endDate: Date | string) {
  if (new Date(endDate) <= new Date(startDate)) {
    throw new RoadmapError("endDate must be after startDate");
  }
}

export async function createRoadmapItem(
  kind: EditableRoadmapKind,
  input: AnyRoadmapInput,
): Promise<EditableRoadmapItem> {
  assertDates(input.startDate, input.endDate);

  const model = MODELS[kind];
  const row = await model.delegate().create({
    data: toData(kind, input, "create"),
    include: model.include,
  });

  return serialize(kind, row);
}

async function findExisting(kind: EditableRoadmapKind, id: string) {
  const existing = await MODELS[kind].delegate().findUnique({ where: { id } });

  if (
    !existing ||
    (isRaidKind(kind) &&
      (existing.type === "MultiFloorRaid") !== (kind === "frr"))
  ) {
    throw new RoadmapError("Item not found", 404);
  }

  return existing;
}

export async function updateRoadmapItem(
  kind: EditableRoadmapKind,
  id: string,
  input: Partial<AnyRoadmapInput>,
): Promise<EditableRoadmapItem> {
  const existing = await findExisting(kind, id);

  assertDates(
    input.startDate ?? existing.startDate,
    input.endDate ?? existing.endDate,
  );

  const model = MODELS[kind];
  const row = await model.delegate().update({
    where: { id },
    data: toData(kind, input, "update"),
    include: model.include,
  });

  return serialize(kind, row);
}

export async function deleteRoadmapItem(
  kind: EditableRoadmapKind,
  id: string,
): Promise<void> {
  await findExisting(kind, id);

  if (isRaidKind(kind)) {
    await db.$transaction([
      db.eliminateRaidRoom.deleteMany({ where: { eliminateRaidId: id } }),
      db.raid.delete({ where: { id } }),
    ]);
    return;
  }

  await MODELS[kind].delegate().delete({ where: { id } });
}

export async function offsetRoadmapItems(
  kind: EditableRoadmapKind,
  ids: string[],
  offsetMs: number,
): Promise<EditableRoadmapItem[]> {
  if (offsetMs === 0 || ids.length === 0) {
    return [];
  }

  const model = MODELS[kind];
  const where = { id: { in: ids } };
  const rows = await model.delegate().findMany({ where });

  await db.$transaction(
    rows.map((row) =>
      model.delegate().update({
        where: { id: row.id },
        data: {
          startDate: new Date(row.startDate.getTime() + offsetMs),
          // permanent items keep their 2099 end date
          endDate: isPermanent(row.startDate, row.endDate)
            ? PERMANENT_END_DATE
            : new Date(row.endDate.getTime() + offsetMs),
        },
      }),
    ),
  );

  const updated = await model
    .delegate()
    .findMany({ where, include: model.include });

  return updated.map((row) => serialize(kind, row));
}
