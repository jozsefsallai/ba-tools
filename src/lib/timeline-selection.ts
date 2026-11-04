import { v4 as uuid } from "uuid";

type Identified = {
  id: string;
};

export type DragSlot = {
  id: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  isRowBreak: boolean;
};

export type DropTarget = {
  id: string;
  side: "before" | "after";
};

function findDropTarget(
  pointer: {
    x: number;
    y: number;
  },
  slots: DragSlot[],
  groupIds: Set<string>,
): DropTarget | null {
  let nearest: DragSlot | null = null;
  let nearestScore = Number.POSITIVE_INFINITY;

  for (const slot of slots) {
    const dx = Math.max(slot.left - pointer.x, 0, pointer.x - slot.right);
    const dy = Math.max(slot.top - pointer.y, 0, pointer.y - slot.bottom);

    const score = dx * dx + 4 * dy * dy;

    if (score < nearestScore) {
      nearest = slot;
      nearestScore = score;
    }
  }

  if (!nearest || groupIds.has(nearest.id)) {
    return null;
  }

  if (nearest.isRowBreak) {
    return {
      id: nearest.id,
      side: pointer.y > nearest.bottom ? "after" : "before",
    };
  }

  return {
    id: nearest.id,
    side: pointer.x < (nearest.left + nearest.right) / 2 ? "before" : "after",
  };
}

export function findStepDropTarget(
  center: {
    x: number;
    y: number;
  },
  slots: DragSlot[],
  groupIds: Set<string>,
  leadId: string,
): DropTarget | null {
  const lead = slots.find((slot) => slot.id === leadId);
  if (!lead) {
    return findDropTarget(center, slots, groupIds);
  }

  const isOnLeadRow = (slot: DragSlot) =>
    Math.abs(slot.top - lead.top) < (lead.bottom - lead.top) / 2;

  let nearest: DragSlot | null = null;
  let nearestScore = Number.POSITIVE_INFINITY;

  for (const slot of slots) {
    const dx = Math.max(slot.left - center.x, 0, center.x - slot.right);
    const dy = Math.max(slot.top - center.y, 0, center.y - slot.bottom);

    const score = dx * dx + 4 * dy * dy;

    if (score < nearestScore) {
      nearest = slot;
      nearestScore = score;
    }
  }

  if (nearest && !isOnLeadRow(nearest)) {
    return groupIds.has(nearest.id)
      ? null
      : findDropTarget(center, slots, groupIds);
  }

  const first = slots.findIndex((slot) => groupIds.has(slot.id));
  const last = slots.findLastIndex((slot) => groupIds.has(slot.id));

  const before = slots[first - 1];
  const after = slots[last + 1];

  const leadCenter = (lead.left + lead.right) / 2;

  if (
    after &&
    !after.isRowBreak &&
    isOnLeadRow(after) &&
    center.x > leadCenter + (after.right - after.left) / 2
  ) {
    return {
      id: after.id,
      side: "after",
    };
  }

  if (
    before &&
    !before.isRowBreak &&
    isOnLeadRow(before) &&
    center.x < leadCenter - (before.right - before.left) / 2
  ) {
    return {
      id: before.id,
      side: "before",
    };
  }

  return null;
}

export function placeGroup<T extends Identified>(
  items: T[],
  groupIds: Set<string>,
  target: DropTarget,
): T[] {
  const group = items.filter((item) => groupIds.has(item.id));
  const rest = items.filter((item) => !groupIds.has(item.id));
  const targetIndex = rest.findIndex((item) => item.id === target.id);

  return rest.toSpliced(
    targetIndex + (target.side === "after" ? 1 : 0),
    0,
    ...group,
  );
}

export function gatherGroup<T extends Identified>(
  items: T[],
  groupIds: Set<string>,
  activeId: string,
): T[] {
  const group = items.filter((item) => groupIds.has(item.id));
  const rest = items.filter((item) => !groupIds.has(item.id));

  const activeIndex = items.findIndex((item) => item.id === activeId);

  const restBefore = items
    .slice(0, activeIndex)
    .filter((item) => !groupIds.has(item.id)).length;

  return rest.toSpliced(restBefore, 0, ...group);
}

export function nudgeGroup<T extends Identified>(
  items: T[],
  groupIds: Set<string>,
  direction: -1 | 1,
): T[] {
  const next = [
    ...items,
  ];

  const start = direction === -1 ? 0 : next.length - 1;

  for (let i = start; i >= 0 && i < next.length; i -= direction) {
    const neighbor = i + direction;

    if (
      groupIds.has(next[i].id) &&
      neighbor >= 0 &&
      neighbor < next.length &&
      !groupIds.has(next[neighbor].id)
    ) {
      [next[i], next[neighbor]] = [
        next[neighbor],
        next[i],
      ];
    }
  }

  return next;
}

export function moveGroupToEdge<T extends Identified>(
  items: T[],
  groupIds: Set<string>,
  edge: "start" | "end",
): T[] {
  const group = items.filter((item) => groupIds.has(item.id));
  const rest = items.filter((item) => !groupIds.has(item.id));

  return edge === "start"
    ? [
        ...group,
        ...rest,
      ]
    : [
        ...rest,
        ...group,
      ];
}

export function duplicateGroup<T extends Identified>(
  items: T[],
  groupIds: Set<string>,
): {
  items: T[];
  copyIds: Set<string>;
} {
  const copies = items
    .filter((item) => groupIds.has(item.id))
    .map((item) => ({
      ...item,
      id: uuid(),
    }));

  const lastIndex = items.findLastIndex((item) => groupIds.has(item.id));

  return {
    items: items.toSpliced(lastIndex + 1, 0, ...copies),
    copyIds: new Set(copies.map((copy) => copy.id)),
  };
}

export function removeGroup<T extends Identified>(
  items: T[],
  groupIds: Set<string>,
): T[] {
  return items.filter((item) => !groupIds.has(item.id));
}

export function haveSameOrder<T extends Identified>(a: T[], b: T[]) {
  return a.length === b.length && a.every((item, i) => item.id === b[i].id);
}

export type HeldRowBreak = {
  afterId: string | null;
  height: number | undefined;
};

export type BlockSide = "beforeBreak" | "afterBreak";

export function getHeldRowBreaks<
  T extends Identified & {
    type: string;
    orientation?: string;
    size?: number;
  },
>(items: T[], groupIds: Set<string>): HeldRowBreak[] {
  const breaks: HeldRowBreak[] = [];
  let afterId: string | null = null;

  for (const item of items) {
    if (!groupIds.has(item.id)) {
      afterId = item.id;
    } else if (item.type === "separator" && item.orientation === "vertical") {
      breaks.push({
        afterId,
        height: item.size,
      });
    }
  }

  return breaks;
}

export function placeHeldRowBreaks<T extends Identified>(
  order: T[],
  groupIds: Set<string>,
  breaks: HeldRowBreak[],
  blockSide: BlockSide,
  defaultHeight: number,
): Map<string | null, number> {
  const placed = new Map<string | null, number>();

  for (const { afterId, height } of breaks) {
    let hostId = afterId;

    if (afterId !== null && blockSide === "beforeBreak") {
      let index = order.findIndex((item) => item.id === afterId) + 1;

      while (index < order.length && groupIds.has(order[index].id)) {
        hostId = order[index].id;
        index += 1;
      }
    }

    placed.set(hostId, (placed.get(hostId) ?? 0) + (height ?? defaultHeight));
  }

  return placed;
}
