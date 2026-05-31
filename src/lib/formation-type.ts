export type FormationType = "normal" | "finalRestrictionRelease";

export const NORMAL_STARTER_THRESHOLD = 3;
export const FRR_STARTER_THRESHOLD = 5;
export const NORMAL_STARTER_MAX = 5;
export const FRR_STARTER_MAX = 9;

type FormationTypeRowItem = {
  studentId?: string;
  student?: unknown;
};

type FormationTypeRow = {
  strikers: FormationTypeRowItem[];
  specials: FormationTypeRowItem[];
};

type StarterOrderItem = {
  id: string;
  starter?: boolean;
  starterOrder?: number;
};

export function starterThresholdFor(type: FormationType): number {
  return type === "finalRestrictionRelease"
    ? FRR_STARTER_THRESHOLD
    : NORMAL_STARTER_THRESHOLD;
}

export function starterMaxFor(type: FormationType): number {
  return type === "finalRestrictionRelease" ? FRR_STARTER_MAX : NORMAL_STARTER_MAX;
}

function hasStudent(item: FormationTypeRowItem): boolean {
  return item.studentId !== undefined || item.student !== undefined;
}

export function inferFormationType(rows: FormationTypeRow[]): FormationType {
  for (const row of rows) {
    const strikerCount = row.strikers.filter(hasStudent).length;
    const specialCount = row.specials.filter(hasStudent).length;

    if (strikerCount > 4 || specialCount > 2) {
      return "finalRestrictionRelease";
    }
  }

  return "normal";
}

export function resolveStarterOrders(items: StarterOrderItem[]): Map<string, number> {
  const starters = items
    .map((item, displayIndex) => ({
      item,
      displayIndex,
    }))
    .filter(({ item }) => item.starter);

  starters.sort((a, b) => {
    const aOrder = a.item.starterOrder ?? Number.POSITIVE_INFINITY;
    const bOrder = b.item.starterOrder ?? Number.POSITIVE_INFINITY;
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    return a.displayIndex - b.displayIndex;
  });

  return new Map(starters.map(({ item }, index) => [item.id, index + 1]));
}
