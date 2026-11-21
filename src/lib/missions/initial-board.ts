import type { MissionMapData } from "@/lib/game-data/contract";
import type { MissionSnapshot, MissionSolutions } from "@/lib/missions/solver";

export function initialBoard(
  map: MissionMapData,
  solutions: MissionSolutions,
): MissionSnapshot {
  const route = solutions.fastest ?? solutions.withBox ?? solutions.allStars;
  const start = route?.steps[0]?.start;

  if (start) {
    return {
      ...start,
      echelons: [],
    };
  }

  const hidden = map.events
    .filter((e) => e.conditions.some((c) => c.type === "start"))
    .flatMap((e) =>
      e.commands.flatMap((c) => (c.type === "hideTiles" ? c.tiles : [])),
    );

  return {
    echelons: [],
    enemies: map.units.map((u) => ({
      x: u.x,
      y: u.y,
      entityId: u.entityId,
    })),
    hidden,
    objects: map.objects.map((o) => o.entityId),
    switches: {},
  };
}
