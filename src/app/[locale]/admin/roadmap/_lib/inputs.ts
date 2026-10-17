import type { AnyRoadmapInput, RoadmapInput } from "@/lib/roadmap/schemas";
import type {
  EditableRoadmapItem,
  EditableRoadmapKind,
} from "@/lib/roadmap/types";

function at(date: Date, dayOffset: number, h: number, m = 0, s = 0) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + dayOffset,
      h,
      m,
      s,
    ),
  ).toISOString();
}

export function defaultInput(
  kind: EditableRoadmapKind,
  date: Date,
): AnyRoadmapInput {
  // every new item lasts 7 days by default (end = start + 7 days - 1 minute)
  const week = (hour: number) => ({
    startDate: at(date, 0, hour),
    endDate: at(date, 7, hour, -1),
  });

  const raid: RoadmapInput<"raid"> = {
    ...week(2),
    type: "Raid",
    raidBoss: null,
    multiFloorRaidBoss: null,
    worldRaidBoss: null,
    timeAttackDungeonType: null,
    attackTypes: [],
    defenseTypes: [],
    terrains: [],
    rooms: [],
  };

  switch (kind) {
    case "raid":
      return raid;
    case "frr":
      return {
        ...raid,
        type: "MultiFloorRaid",
      };
    case "event":
      return {
        ...week(2),
        name: "",
        internalId: "",
        type: "Initial",
        eventStudentId: null,
      };
    case "story":
      return {
        ...week(2),
        name: "",
        internalId: "",
        type: "Main",
        episodeCount: 0,
      };
    case "bonus":
      return {
        ...week(19),
        type: "NormalMission",
        bonusMultiply: 2,
      };
    case "workLog":
    case "battlePass":
      return {
        ...week(2),
        name: "",
      };
    case "etc":
      return {
        ...week(2),
        label: "",
        description: null,
      };
  }
}

/** The editable fields of an existing item. */
export function itemToInput(item: EditableRoadmapItem): AnyRoadmapInput {
  const dates = { startDate: item.startDate, endDate: item.endDate };

  switch (item.kind) {
    case "raid":
    case "frr":
      return {
        ...dates,
        type: item.type,
        raidBoss: item.raidBoss,
        multiFloorRaidBoss: item.multiFloorRaidBoss,
        worldRaidBoss: item.worldRaidBoss,
        timeAttackDungeonType: item.timeAttackDungeonType,
        attackTypes: item.attackTypes,
        defenseTypes: item.defenseTypes,
        terrains: item.terrains,
        rooms: item.rooms,
      };
    case "event":
      return {
        ...dates,
        name: item.name,
        internalId: item.internalId,
        type: item.type,
        eventStudentId: item.eventStudent?.id ?? null,
      };
    case "story":
      return {
        ...dates,
        name: item.name,
        internalId: item.internalId,
        type: item.type,
        episodeCount: item.episodeCount,
      };
    case "bonus":
      return { ...dates, type: item.type, bonusMultiply: item.bonusMultiply };
    case "workLog":
    case "battlePass":
      return { ...dates, name: item.name };
    case "etc":
      return { ...dates, label: item.label, description: item.description };
  }
}
