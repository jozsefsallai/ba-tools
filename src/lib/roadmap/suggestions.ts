import type {
  ContentPeriod,
  UpcomingChapter,
  UpcomingEvent,
  UpcomingRaid,
} from "@/lib/game-data/contract";
import {
  ATTACK_TYPES,
  DAY_MS,
  DEFENSE_TYPES,
  PERMANENT_END_DATE,
  TERRAINS,
  TIME_ATTACK_DUNGEON_TYPES,
} from "@/lib/roadmap/constants";
import type { AnyRoadmapInput, RoadmapInput } from "@/lib/roadmap/schemas";
import type {
  EditableRoadmapKind,
  RoadmapEventItem,
  RoadmapRaidItem,
  RoadmapStoryItem,
} from "@/lib/roadmap/types";
import type {
  EventRunType,
  MultiFloorRaidBoss,
  RaidBoss,
  RaidType,
  ScenarioType,
} from "~prisma";

export type SuggestionDateSource = "global" | "projected" | "none";

export type RoadmapSuggestion = {
  /** `${kind}:${id in the game files}` */
  id: string;
  kind: EditableRoadmapKind;
  input: AnyRoadmapInput;
  dateSource: SuggestionDateSource;
  /** When it ran on JP; `null` for stories. */
  jpStartDate: string | null;
  /** A JP season that only repeats the one before it and may still change. */
  tentative: boolean;
  /** The game's name for a boss the roadmap doesn't know yet. */
  unknownBoss: string | null;
  /** `true` when only the Japanese name is known. */
  untranslated: boolean;
};

// RaidBossGroupType
const RAID_BOSSES_BY_GAME_NAME: Record<string, RaidBoss> = {
  Binah: "Binah",
  Chesed: "Chesed",
  ShiroKuro: "ShiroKuro",
  Hieronymus: "Hieronymus",
  Kaitenger: "KAITEN",
  Perorozilla: "Perorodzilla",
  HOD: "Hod",
  Goz: "Goz",
  EN0005: "Gregorius",
  HoverCraft: "Hovercraft",
  EN0006: "Kurokage",
  EN0010: "Geburah",
  EN0013: "Yesod",
  EN0022: "Drumbarka",
  EN0023: "NightmareTrain",
};

const MULTI_FLOOR_RAID_BOSSES_BY_GAME_NAME: Record<string, MultiFloorRaidBoss> =
  {
    EN0008: "TheFuryOfSet",
    EN0009: "Chokmah",
    EN0011: "Tiphareth",
  };

const RAID_TYPES_BY_KIND: Record<UpcomingRaid["kind"], RaidType> = {
  raid: "Raid",
  eliminateRaid: "EliminateRaid",
  multiFloorRaid: "MultiFloorRaid",
  timeAttackDungeon: "TimeAttackDungeon",
};

const EVENT_TYPES_BY_KIND: Record<UpcomingEvent["kind"], EventRunType> = {
  event: "Initial",
  mini: "Initial",
  rerun: "Reprint",
  permanent: "Permanent",
};

const SCENARIO_TYPES_BY_MODE: Record<string, ScenarioType> = {
  Main: "Main",
  SpecialOperation: "Main",
  Sub: "Sub",
  Mini: "Mini",
};

// How far Global runs behind JP when nothing better is known.
const DEFAULT_GLOBAL_DELAY_MS = 104 * DAY_MS;

const MINUTE_MS = 60 * 1000;

function known<T extends string>(values: string[], options: readonly T[]): T[] {
  return values.filter((value): value is T =>
    (options as readonly string[]).includes(value),
  );
}

const time = (date: string) => new Date(date).getTime();

/** Roadmap items end on the minute (`18:59:00`), the game on its last second. */
const toMinute = (ms: number) =>
  new Date(Math.floor(ms / MINUTE_MS) * MINUTE_MS).toISOString();

const isForever = (period: ContentPeriod) =>
  new Date(period.end).getUTCFullYear() >= 2099;

type Dates = {
  startDate: string;
  endDate: string;
  dateSource: SuggestionDateSource;
};

/**
 * Where a roadmap item sits in the JP sequence: the item, and when the same
 * content started on JP.
 */
type Anchor = {
  startDate: string;
  jpStart: string;
};

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  const sorted = [
    ...values,
  ].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** How far Global runs behind JP, from the content both servers' files date. */
export function globalDelay(
  items: {
    jp: ContentPeriod;
    global: ContentPeriod | null;
  }[],
): number {
  return (
    median(
      items.flatMap((item) =>
        item.global
          ? [
              time(item.global.start) - time(item.jp.start),
            ]
          : [],
      ),
    ) ?? DEFAULT_GLOBAL_DELAY_MS
  );
}

/**
 * Global's dates for content that ran on JP. Global's own files win. Otherwise
 * the JP dates move by the gap between the anchor's roadmap and JP dates, so a
 * roadmap that was shifted by hand stays in step; without an anchor they move
 * by the usual delay.
 */
function resolveDates(
  item: {
    jp: ContentPeriod;
    global: ContentPeriod | null;
  },
  anchor: Anchor | null,
  delay: number,
): Dates {
  const source = item.global ?? item.jp;
  const offset = item.global
    ? 0
    : anchor
      ? time(anchor.startDate) - time(anchor.jpStart)
      : delay;

  return {
    startDate: toMinute(time(source.start) + offset),
    endDate: isForever(source)
      ? PERMANENT_END_DATE
      : toMinute(time(source.end) + offset),
    dateSource: item.global ? "global" : "projected",
  };
}

function sameSet(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((value) => b.includes(value));
}

type RaidInput = Omit<RoadmapInput<"raid">, "startDate" | "endDate">;

function raidInput(raid: UpcomingRaid): RaidInput {
  const type = RAID_TYPES_BY_KIND[raid.kind];
  const defenseTypes = known(raid.armorTypes, DEFENSE_TYPES);

  return {
    type,
    raidBoss:
      type === "Raid" || type === "EliminateRaid"
        ? (RAID_BOSSES_BY_GAME_NAME[raid.boss] ?? null)
        : null,
    multiFloorRaidBoss:
      type === "MultiFloorRaid"
        ? (MULTI_FLOOR_RAID_BOSSES_BY_GAME_NAME[raid.boss] ?? null)
        : null,
    worldRaidBoss: null,
    timeAttackDungeonType:
      type === "TimeAttackDungeon"
        ? (known(
            [
              raid.boss,
            ],
            TIME_ATTACK_DUNGEON_TYPES,
          )[0] ?? null)
        : null,
    attackTypes: known(raid.attackTypes, ATTACK_TYPES),
    // a Grand Assault has an armor type per room instead
    defenseTypes: type === "EliminateRaid" ? [] : defenseTypes,
    terrains: known(raid.terrains, TERRAINS),
    rooms: raid.rooms.map((room) => ({
      attackTypes: [],
      defenseTypes: known(room.armorTypes, DEFENSE_TYPES),
      terrains: [],
      hasTorment: room.hasTorment,
      hasLunatic: room.hasLunatic,
    })),
  };
}

function raidBossOf(input: RaidInput | RoadmapRaidItem) {
  return (
    input.raidBoss ??
    input.multiFloorRaidBoss ??
    input.worldRaidBoss ??
    input.timeAttackDungeonType
  );
}

/**
 * Whether a roadmap item is this season: same boss, terrain and armor types.
 * Final Restriction Release is told apart by boss and armor type alone, since
 * the terrain on the roadmap doesn't always follow the game files.
 */
function isSameRaid(item: RoadmapRaidItem, input: RaidInput) {
  if (
    item.type !== input.type ||
    raidBossOf(item) === null ||
    raidBossOf(item) !== raidBossOf(input) ||
    (input.type !== "MultiFloorRaid" && !sameSet(item.terrains, input.terrains))
  ) {
    return false;
  }

  if (input.type !== "EliminateRaid") {
    return sameSet(item.defenseTypes, input.defenseTypes);
  }

  return (
    item.rooms.length === input.rooms.length &&
    item.rooms.every((room, index) =>
      sameSet(room.defenseTypes, input.rooms[index].defenseTypes),
    )
  );
}

function hasUnknownBoss(input: RaidInput) {
  return raidBossOf(input) === null;
}

/**
 * The seasons that come after the newest one on the roadmap, per raid type.
 * `raids` are the cached seasons of one roadmap kind, oldest first within a
 * type; `existing` is every roadmap item of that kind.
 */
export function suggestRaids(
  kind: "raid" | "frr",
  raids: UpcomingRaid[],
  existing: RoadmapRaidItem[],
): RoadmapSuggestion[] {
  const delay = globalDelay(raids);
  const byStart = [
    ...existing,
  ].sort((a, b) => time(b.startDate) - time(a.startDate));

  const suggestions: RoadmapSuggestion[] = [];

  for (const raidKind of new Set(raids.map((raid) => raid.kind))) {
    const seasons = raids
      .filter((raid) => raid.kind === raidKind)
      .map((raid) => ({
        raid,
        input: raidInput(raid),
      }));
    const type = RAID_TYPES_BY_KIND[raidKind];
    const items = byStart.filter((item) => item.type === type);

    // The newest roadmap item that is one of the cached seasons. Bosses come
    // back, so of the seasons it could be, it is the one Global would be
    // running around the item's date.
    let anchor: Anchor | null = null;
    let anchorIndex = -1;

    for (const item of items) {
      const distance = (raid: UpcomingRaid) =>
        Math.abs(time(raid.jp.start) + delay - time(item.startDate));
      let index = -1;

      seasons.forEach(({ raid, input }, candidate) => {
        if (
          isSameRaid(item, input) &&
          (index < 0 || distance(raid) < distance(seasons[index].raid))
        ) {
          index = candidate;
        }
      });

      if (index >= 0) {
        anchor = {
          startDate: item.startDate,
          jpStart: seasons[index].raid.jp.start,
        };
        anchorIndex = index;
        break;
      }
    }

    const latestStart = items[0] ? time(items[0].startDate) : null;

    for (const { raid, input } of seasons.slice(anchorIndex + 1)) {
      const dates = resolveDates(raid, anchor, delay);
      const start = time(dates.startDate);

      // Without an anchor every cached season is a candidate, so leave out
      // the ones the roadmap has moved past
      if (
        (latestStart !== null && start <= latestStart) ||
        (latestStart === null && start < Date.now() - 14 * DAY_MS)
      ) {
        continue;
      }

      suggestions.push({
        id: `${raid.kind}:${raid.seasonId}`,
        kind,
        input: {
          ...input,
          startDate: dates.startDate,
          endDate: dates.endDate,
        },
        dateSource: dates.dateSource,
        jpStartDate: raid.jp.start,
        tentative: raid.tentative,
        unknownBoss: hasUnknownBoss(input) ? raid.boss : null,
        untranslated: false,
      });
    }
  }

  return suggestions.sort(
    (a, b) => time(a.input.startDate) - time(b.input.startDate),
  );
}

function eventName(event: UpcomingEvent) {
  const name = event.nameEn ?? event.nameJp ?? "";
  // the recurring mini event is told apart by its run
  return event.season === null ? name : `[S${event.season}] ${name}`;
}

/**
 * The ids a roadmap item for this event may have. The game gives every run
 * its own id (`840`, its rerun `10840`, its permanent copy `900840`), which is
 * the first one. Permanent copies have also been saved under the id of the
 * event they are a copy of.
 */
function eventInternalIds(event: UpcomingEvent) {
  return [
    event.id,
    ...(event.kind === "permanent" && event.originalId !== null
      ? [
          event.originalId,
        ]
      : []),
  ].map(String);
}

/**
 * The events that came after the newest roadmap event on JP. `students` maps
 * the game's character ids to student ids, for the welfare student.
 */
export function suggestEvents(
  events: UpcomingEvent[],
  existing: RoadmapEventItem[],
  students: Map<number, string>,
): RoadmapSuggestion[] {
  const delay = globalDelay(events);
  const key = (internalId: string, type: EventRunType) =>
    `${internalId.trim()}:${type}`;

  const onRoadmap = new Map<string, RoadmapEventItem>();
  for (const item of existing) {
    const itemKey = key(item.internalId, item.type);
    const seen = onRoadmap.get(itemKey);

    // a rerun of a rerun reuses the id: the newest one is where the roadmap is
    if (!seen || time(item.startDate) > time(seen.startDate)) {
      onRoadmap.set(itemKey, item);
    }
  }

  const candidates = events.map((event) => ({
    event,
    internalIds: eventInternalIds(event),
    type: EVENT_TYPES_BY_KIND[event.kind],
  }));

  // The newest JP event that is on the roadmap
  let anchor: Anchor | null = null;
  let anchorIndex = -1;

  for (const [index, { event, internalIds, type }] of candidates.entries()) {
    const item = internalIds
      .map((id) => onRoadmap.get(key(id, type)))
      .find((match) => match !== undefined);

    if (item) {
      anchor = {
        startDate: item.startDate,
        jpStart: event.jp.start,
      };
      anchorIndex = index;
    }
  }

  return candidates
    .slice(anchorIndex + 1)
    .filter(
      ({ event }) =>
        anchor !== null ||
        time(event.jp.start) + delay >= Date.now() - 14 * DAY_MS,
    )
    .map(({ event, internalIds, type }): RoadmapSuggestion => {
      const dates = resolveDates(event, anchor, delay);
      const studentId = event.rewardCharacterIds
        .map((id) => students.get(id))
        .find((id) => id !== undefined);

      return {
        id: `event:${event.id}`,
        kind: "event",
        input: {
          startDate: dates.startDate,
          endDate: dates.endDate,
          name: eventName(event),
          internalId: internalIds[0],
          type,
          eventStudentId: studentId ?? null,
        },
        dateSource: dates.dateSource,
        jpStartDate: event.jp.start,
        tentative: false,
        unknownBoss: null,
        untranslated: event.nameEn === null,
      };
    });
}

const normalize = (value: string) => value.trim().toLowerCase();

/**
 * The ids a chapter may be saved under: the game's
 * (`Main_Series2_3_1`), and the shorter ones used on the roadmap (`Mini_15`).
 */
function chapterIds(chapter: UpcomingChapter) {
  const { modeType, subType, volumeId, chapterId } = chapter;

  return [
    chapter.id,
    `${modeType}_${volumeId}`,
    `${modeType}_${volumeId}_${chapterId}`,
    `${subType}_${modeType}_${volumeId}_${chapterId}`,
  ].map(normalize);
}

function chapterInternalId(chapter: UpcomingChapter) {
  return chapter.modeType === "Mini" || chapter.modeType === "Sub"
    ? `${chapter.modeType}_${chapter.volumeId}`
    : chapter.id;
}

// The game files number the final volume 100
const FINAL_VOLUME_ID = 100;

/**
 * Where a main story chapter is in the story, the way the game numbers it:
 * `Act 2, Volume 2, Chapter 1`, with `, Part 2` for a later part. Special
 * Operation chapters are Volume EX. Other stories aren't numbered.
 */
export function chapterLabel(
  chapter: UpcomingChapter,
  part: number | null = null,
): string | null {
  const act = chapter.subType.match(/^Series(\d+)$/)?.[1];

  if (
    !act ||
    (chapter.modeType !== "Main" && chapter.modeType !== "SpecialOperation")
  ) {
    return null;
  }

  const volume =
    chapter.modeType === "SpecialOperation"
      ? "EX"
      : chapter.displayVolumeId ||
        (chapter.volumeId === FINAL_VOLUME_ID ? "F" : String(chapter.volumeId));
  const label = `Act ${act}, Volume ${volume}, Chapter ${chapter.chapterId}`;

  return part === null ? label : `${label}, Part ${part}`;
}

/** A batch of a chapter's episodes that is released together. */
type ChapterPart = {
  episodeCount: number;
  /** When it opens on Global; `null` when only JP has it. */
  openDate: string | null;
};

/**
 * The parts a chapter comes out in. Global dates every episode, so its parts
 * are exact. JP has no dates: the episodes it has beyond Global's are one more
 * part, which is how a new part shows up there.
 */
function chapterParts(chapter: UpcomingChapter): ChapterPart[] {
  const parts: ChapterPart[] = chapter.globalParts.map((part) => ({
    episodeCount: part.episodeCount,
    openDate: part.openDate,
  }));
  const dated = parts.reduce((sum, part) => sum + part.episodeCount, 0);

  if (chapter.episodeCount > dated) {
    parts.push({
      episodeCount: chapter.episodeCount - dated,
      openDate: null,
    });
  }

  return parts;
}

/**
 * The chapters that come after the newest one on the roadmap, per mode type
 * (JP's files only order chapters within one), and the later parts of the
 * chapters that are on it: the episodes the game files have beyond the ones
 * the roadmap's items count. JP has no release dates, so a part Global's
 * files don't date yet starts on `fallbackStartDate`.
 */
export function suggestStories(
  chapters: UpcomingChapter[],
  existing: RoadmapStoryItem[],
  fallbackStartDate: string,
): RoadmapSuggestion[] {
  const itemsOf = (chapter: UpcomingChapter) => {
    const ids = chapterIds(chapter);
    const names = [
      chapter.nameEn,
      chapter.nameJp,
    ].flatMap((name) =>
      name === null
        ? []
        : [
            normalize(name),
          ],
    );
    const label = chapterLabel(chapter);
    const numbered = (value: string | null) =>
      label !== null &&
      value !== null &&
      // `…, Chapter 1` and `…, Chapter 1, Part 2`, but not `…, Chapter 10`
      (normalize(value) === normalize(label) ||
        normalize(value).startsWith(`${normalize(label)},`));

    return existing.filter(
      (item) =>
        ids.includes(normalize(item.internalId)) ||
        names.includes(normalize(item.name)) ||
        numbered(item.label) ||
        numbered(item.name),
    );
  };

  const suggestions: RoadmapSuggestion[] = [];

  for (const [mode, type] of Object.entries(SCENARIO_TYPES_BY_MODE)) {
    const ordered = chapters
      .filter((chapter) => chapter.modeType === mode)
      .sort((a, b) => a.order - b.order)
      .map((chapter) => ({
        chapter,
        items: itemsOf(chapter),
      }));
    const anchorIndex = ordered.findLastIndex(({ items }) => items.length > 0);

    for (const [index, { chapter, items }] of ordered.entries()) {
      // chapters before the newest one on the roadmap came out before it began
      if (items.length === 0 && index < anchorIndex) {
        continue;
      }

      const covered = items.reduce((sum, item) => sum + item.episodeCount, 0);

      // without episode counts there is no telling which parts are on it
      if (items.length > 0 && covered <= 0) {
        continue;
      }

      const parts = chapterParts(chapter);
      const numbered = parts.length > 1 || items.length > 0;
      let released = 0;
      let suggested = 0;

      for (const [partIndex, part] of parts.entries()) {
        const start = released;
        released += part.episodeCount;

        if (released <= covered) {
          continue;
        }

        const number = items.length > 0 ? items.length + suggested : partIndex;
        suggested++;

        // already out on Global, so it only precedes a roadmap that starts later
        if (
          part.openDate !== null &&
          time(part.openDate) < Date.now() - 14 * DAY_MS
        ) {
          continue;
        }

        suggestions.push({
          id: numbered
            ? `chapter:${chapter.id}#${number + 1}`
            : `chapter:${chapter.id}`,
          kind: "story",
          input: {
            startDate: part.openDate ?? fallbackStartDate,
            endDate: PERMANENT_END_DATE,
            name: chapter.nameEn ?? chapter.nameJp ?? "",
            label: chapterLabel(chapter, numbered ? number + 1 : null),
            internalId: chapterInternalId(chapter),
            type,
            // a roadmap item may end partway through a part
            episodeCount: released - Math.max(start, covered),
          },
          dateSource: part.openDate ? "global" : "none",
          jpStartDate: null,
          tentative: false,
          unknownBoss: null,
          untranslated: chapter.nameEn === null,
        });
      }
    }
  }

  return suggestions;
}
