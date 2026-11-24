import "server-only";

import { z } from "zod";
import {
  teamBattles,
  teamDamageTypes,
} from "@/app/[locale]/missions/_lib/team-damage";
import { getGameItems } from "@/lib/data/game-items.server";
import {
  getMission,
  listMissions,
  type MissionSummary,
} from "@/lib/data/missions.server";
import type {
  HexCoord,
  MissionMapData,
  MissionMapUnit,
  MissionRewardData,
} from "@/lib/game-data/contract";
import { gameItemKey } from "@/lib/game-items";
import { mainArmor } from "@/lib/missions/armor";
import {
  echelonName,
  hexDirection,
  missionLabel,
  parseMissionLabel,
} from "@/lib/missions/labels";
import type {
  EnemyAction,
  MissionAction,
  MissionSolution,
  MissionSolutionTurn,
} from "@/lib/missions/solver";
import { SITE_ORIGIN } from "@/lib/og-metadata.server";
import { notFound } from "@/lib/public-api/route";
import { buildGameItemIconUrl } from "@/lib/url";
import { MissionDifficulty } from "~prisma";

const ROUTE_KINDS = [
  "fastest",
  "withBox",
  "allStars",
] as const;

const coord = ({ x, y }: HexCoord) => ({
  x,
  y,
});

function enemyOf(map: MissionMapData, entityId: number) {
  const unit = map.units.find((u) => u.entityId === entityId);

  return {
    entityId,
    boss: unit?.grade === "Boss",
    defenseType: unit ? mainArmor(unit) : null,
  };
}

function playerAction(map: MissionMapData, action: MissionAction) {
  const base = {
    team: echelonName(action.echelon),
    from: coord(action.from),
    to: coord(action.to),
  };

  switch (action.type) {
    case "move":
      return {
        type: "move" as const,
        ...base,
        direction: hexDirection(action.from, action.to),
        attacks:
          action.battle === undefined ? null : enemyOf(map, action.battle),
        picksUpBox: action.pickup ?? false,
        togglesSwitch: action.switchId !== undefined,
      };
    case "swap":
      return {
        type: "swap" as const,
        ...base,
        otherTeam: echelonName(action.other),
      };
    case "teleport":
      return {
        type: "teleport" as const,
        ...base,
        attacks:
          action.battle === undefined ? null : enemyOf(map, action.battle),
      };
    case "evacuate":
      return {
        type: "evacuate" as const,
        ...base,
      };
    case "withdraw":
      return {
        type: "withdraw" as const,
        ...base,
        direction: hexDirection(action.from, action.to),
        attacks: enemyOf(map, action.enemy),
      };
  }
}

function enemyAction(map: MissionMapData, action: EnemyAction) {
  const base = {
    enemy: enemyOf(map, action.entityId),
    from: coord(action.from),
    to: coord(action.to),
    direction: hexDirection(action.from, action.to),
    scripted: action.scripted ?? false,
  };

  return action.battle === undefined
    ? {
        type: "move" as const,
        ...base,
      }
    : {
        type: "attack" as const,
        ...base,
        team: echelonName(action.battle),
        teamWithdraws: action.withdrawn ?? false,
      };
}

function turn(map: MissionMapData, step: MissionSolutionTurn) {
  const player = step.frames?.flatMap((f) => f.actions) ?? step.player;
  const enemy = step.enemyPhase?.actions ?? step.enemy;

  return {
    turn: step.turn,
    start: {
      enemy: step.enemy
        .slice(0, step.enemy.length - enemy.length)
        .map((a) => enemyAction(map, a)),
      evacuations: step.player
        .slice(0, step.player.length - player.length)
        .map((a) => playerAction(map, a)),
    },
    player: player.map((a) => playerAction(map, a)),
    enemy: enemy.map((a) => enemyAction(map, a)),
    evacuations: (step.enemyPhase?.evacuations ?? step.afterEnemy).map((a) =>
      playerAction(map, a),
    ),
  };
}

function route(
  map: MissionMapData,
  kind: (typeof ROUTE_KINDS)[number],
  solution: MissionSolution,
) {
  const battles = teamBattles(map, solution);
  const attackTypes = teamDamageTypes(battles);

  return {
    kind,
    turnCount: solution.turns,
    battles: solution.battles,
    withdrawals: solution.withdrawals,
    takesBox: solution.takesBox,
    teams: solution.deploy.map((start, echelon) => ({
      team: echelonName(echelon),
      start: coord(start),
      attackType: attackTypes[echelon] ?? null,
      battles: (battles[echelon] ?? []).map((b) => ({
        defenseType: b.armor,
        boss: b.boss,
        withdrawn: b.withdrawn,
      })),
    })),
    turns: solution.steps.map((step) => turn(map, step)),
  };
}

function enemy(unit: MissionMapUnit) {
  return {
    entityId: unit.entityId,
    x: unit.x,
    y: unit.y,
    grade: unit.grade,
    boss: unit.grade === "Boss",
    ai: unit.ai,
    moveRange: unit.moveRange,
    defenseType: mainArmor(unit),
    defenseTypes: unit.armorTypes,
    attackTypes: unit.attackTypes,
  };
}

async function itemMap(rewards: MissionRewardData[]) {
  return new Map(
    (await getGameItems(rewards)).map((i) => [
      gameItemKey(i.parcelType, i.itemId),
      i,
    ]),
  );
}

type ItemMap = Awaited<ReturnType<typeof itemMap>>;

function drop(items: ItemMap, r: MissionRewardData) {
  if (r.parcelType === "Currency") {
    return {
      tag: r.tag,
      parcelType: r.parcelType,
      parcelId: r.parcelId,
      name: "Pyroxene",
      nameJP: "青輝石",
      rarity: "R" as const,
      iconUrl: buildGameItemIconUrl("Currency_Icon_Gem"),
      amount: r.amount,
      probability: r.probability,
    };
  }

  const item = items.get(gameItemKey(r.parcelType, r.parcelId));

  return {
    tag: r.tag,
    parcelType: r.parcelType,
    parcelId: r.parcelId,
    name: item?.name ?? null,
    nameJP: item?.nameJP ?? null,
    rarity: item?.rarity ?? null,
    iconUrl: item ? buildGameItemIconUrl(item.iconName) : null,
    amount: r.amount,
    probability: r.probability,
  };
}

function summary(mission: MissionSummary, items: ItemMap) {
  const label = missionLabel(mission);

  return {
    label,
    chapter: mission.chapter,
    stage: mission.stage,
    difficulty: mission.difficulty,
    cost: mission.cost,
    terrain: mission.terrain,
    recommendedLevel: mission.recommendedLevel,
    echelonCount: mission.echelonCount,
    starTurns: mission.starTurns,
    starSRanks: mission.starSRanks,
    challengeTurns: mission.challengeTurns,
    fastestTurns: mission.fastestTurns,
    isReleasedGlobal: mission.isReleasedGlobal,
    url: `${SITE_ORIGIN}/missions/${label}`,
    mapImageUrl: `${SITE_ORIGIN}/api/missions/${label}/map`,
    drops: mission.rewards.map((r) => drop(items, r)),
  };
}

export const missionSearchSchema = z.object({
  difficulty: z.enum(MissionDifficulty).optional(),
  chapter: z.coerce
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Only the missions of this area."),
  drop: z
    .string()
    .optional()
    .describe(
      "Only missions that drop an item whose English or Japanese name contains this (as a regular or rare drop).",
    ),
});

export async function listMissionSummaries({
  difficulty,
  chapter,
  drop: dropQuery,
}: z.infer<typeof missionSearchSchema>) {
  const missions = await listMissions();
  const items = await itemMap(missions.flatMap((m) => m.rewards));

  const q = dropQuery?.trim().toLowerCase();

  return missions
    .filter((m) => !difficulty || m.difficulty === difficulty)
    .filter((m) => chapter === undefined || m.chapter === chapter)
    .map((m) => summary(m, items))
    .filter(
      (m) =>
        !q ||
        m.drops.some(
          (d) =>
            (d.tag === "Default" || d.tag === "Rare") &&
            [
              d.name,
              d.nameJP,
            ].some((n) => n?.toLowerCase().includes(q)),
        ),
    );
}

export async function getMissionDetail(identifier: string) {
  const where = parseMissionLabel(identifier.trim());
  const mission = where ? await getMission(where) : null;
  if (!mission) {
    throw notFound("Mission not found.");
  }

  const { solutions, map } = mission;

  return {
    ...summary(mission, await itemMap(mission.rewards)),
    enemies: map.units.map(enemy),
    hasBox: solutions.hasBox,
    routeSearchExhausted: solutions.exhausted,
    routes: ROUTE_KINDS.flatMap((kind) => {
      const solution = solutions[kind];
      return solution
        ? [
            route(map, kind, solution),
          ]
        : [];
    }),
  };
}
