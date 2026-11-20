import {
  attackTypeColor,
  type CombatColor,
  defenseTypeColor,
  effectiveAttackType,
} from "@/lib/combat-colors";
import type { MissionMapData } from "@/lib/game-data/contract";
import { mainArmor } from "@/lib/missions/armor";
import { type MissionSolution, routeBattles } from "@/lib/missions/solver";
import type { AttackType, DefenseType } from "~prisma";

const TYPE_STYLES: Record<
  CombatColor | "none",
  {
    fill: string;
    text: string;
  }
> = {
  red: {
    fill: "var(--color-type-red)",
    text: "text-red-700 dark:text-red-400",
  },
  yellow: {
    fill: "var(--color-type-yellow)",
    text: "text-amber-700 dark:text-amber-400",
  },
  blue: {
    fill: "var(--color-type-blue)",
    text: "text-sky-700 dark:text-sky-400",
  },
  purple: {
    fill: "var(--color-type-purple)",
    text: "text-purple-700 dark:text-purple-400",
  },
  green: {
    fill: "var(--color-type-green)",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  none: {
    fill: "#64748b",
    text: "text-slate-600 dark:text-slate-300",
  },
};

/** Board and text colours for a team by its attack type; grey for none. */
export const attackTypeStyle = (attackType: AttackType | null) =>
  TYPE_STYLES[attackTypeColor(attackType) ?? "none"];

/** Board and text colours for an enemy by its armor type; grey for none. */
export const defenseTypeStyle = (defenseType: string | null) =>
  TYPE_STYLES[defenseTypeColor(defenseType) ?? "none"];

export interface TeamBattle {
  armor: DefenseType | null;
  boss: boolean;
  withdrawn: boolean;
}

export function teamBattles(
  map: MissionMapData,
  solution: MissionSolution,
): TeamBattle[][] {
  const units = new Map(
    map.units.map((u) => [
      u.entityId,
      u,
    ]),
  );

  const battles = solution.deploy.map((): TeamBattle[] => []);

  for (const { echelon, entityId, withdrawn } of routeBattles(solution.steps)) {
    const unit = units.get(entityId);

    battles[echelon]?.push({
      armor: unit ? mainArmor(unit) : null,
      boss: unit?.grade === "Boss",
      withdrawn,
    });
  }

  return battles;
}

/**
 * The attack type each team should bring: the one effective against the armor
 * it fights most often. Null for teams that never fight.
 */
export function teamDamageTypes(
  battles: TeamBattle[][],
): (AttackType | null)[] {
  return battles.map((team) => {
    const counts = new Map<AttackType, number>();

    for (const battle of team) {
      const attackType = effectiveAttackType(battle.armor);
      if (attackType && !battle.withdrawn) {
        counts.set(attackType, (counts.get(attackType) ?? 0) + 1);
      }
    }

    let best: AttackType | null = null;

    for (const [attackType, n] of counts) {
      if (best === null || n > (counts.get(best) ?? 0)) {
        best = attackType;
      }
    }

    return best;
  });
}
