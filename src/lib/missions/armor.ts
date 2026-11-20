import { defenseTypeColor } from "@/lib/combat-colors";
import type { MissionMapUnit } from "@/lib/game-data/contract";
import type { DefenseType } from "~prisma";

/**
 * The armor a team should be matched to for an enemy: its battle's most common
 * one (a boss with a few Light-armored escorts is still a Special-armor fight).
 */
export function mainArmor(unit: Pick<MissionMapUnit, "armorTypes">) {
  const armor = unit.armorTypes[0];

  return defenseTypeColor(armor) ? (armor as DefenseType) : null;
}
