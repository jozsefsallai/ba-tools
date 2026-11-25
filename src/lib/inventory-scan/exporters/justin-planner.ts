import type { InventoryExporter } from "@/lib/inventory-scan/exporters/types";
import type { ScopedItem } from "@/lib/inventory-scan/scope";

const WEAPON_PARTS: Record<string, string> = {
  A: "Spring",
  B: "Hammer",
  C: "Barrel",
  Z: "Needle",
};

/** The planner's key for an item, from its `owned_materials`. */
function materialKey({ group, itemId, series, tier }: ScopedItem) {
  switch (group) {
    case "reports":
      return `XP_${tier}`;
    case "stones":
      return `GXP_${tier}`;
    case "weaponParts":
      return WEAPON_PARTS[series] ? `T${tier}_${WEAPON_PARTS[series]}` : null;
    case "choiceBoxes":
      return `Choice_T${tier}`;
    case "blueprints":
      return tier === 0 ? `G_${series}` : `T${tier}_${series}`;
    case "bluRays":
    case "techNotes":
    case "artifacts":
    case "workbooks":
      return String(itemId);
    case "gifts":
      // Collaboration gifts have much higher ids and aren't in the planner
      return itemId < 5996 ? String(itemId) : null;
  }
}

export const justinPlannerExporter: InventoryExporter = {
  id: "justin-planner",
  name: "Justin's Planner",
  url: "https://justin163.com/planner/",
  filename: "justin-planner-inventory.json",
  supports: (item) => materialKey(item) !== null,
  // A partial import changes only the materials it lists
  export: (entries) => {
    const materials: Record<string, number> = {};

    for (const { item, count } of entries) {
      const key = materialKey(item);

      if (key) {
        materials[key] = count;
      }
    }

    return JSON.stringify(
      {
        exportVersion: 2,
        import_type: "partial",
        characters: [],
        owned_materials: materials,
      },
      null,
      2,
    );
  },
};
