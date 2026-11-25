import type { ItemIconCatalog } from "@/lib/inventory-scan/catalog-format";
import { findRowStrip } from "@/lib/inventory-scan/scan";
import type {
  RowStrip,
  ScannedCell,
  ScannedRow,
  ScannedScreenshot,
  ScanParcelType,
} from "@/lib/inventory-scan/types";

export type ScannedItem = {
  parcelType: ScanParcelType;
  itemId: number;
  value: number | null;
  approximate: boolean;
  uncertain: boolean;
  /** Screenshots disagree on the count */
  conflict: boolean;
  source: {
    screenshot: number;
    cell: ScannedCell;
  };
};

export type MergedInventory = {
  items: ScannedItem[];
  /**
   * Whether the screenshots prove that an item isn't in the list, because what
   * comes before and after it are next to each other.
   */
  isAbsent: (parcelType: ScanParcelType, itemId: number) => boolean;
  parcelTypes: Set<ScanParcelType>;
  /** False when the list isn't in the game's default order */
  defaultOrder: boolean;
  /** Where the screenshots would have to show an item, but don't */
  locateMissing: (parcelType: ScanParcelType, itemId: number) => MissingSpot;
};

/**
 * The screenshots that end right before and begin right after the part of the
 * list an item would be in. Null where the list's start or end isn't shown.
 */
export type MissingSpot = {
  previous: number | null;
  next: number | null;
};

/** The first or last item of a stretch of the list without gaps. */
type RunEdge = {
  parcelType: ScanParcelType;
  consumable: boolean;
  start: number;
  end: number;
  startScreenshot: number;
  endScreenshot: number;
};

type Cell = ScannedCell & {
  screenshot: number;
  /** The unclear icon can't be what it looks most like, going by the order */
  misplaced?: boolean;
};

// A few items at the end of the list are out of order
const MAX_DESCENDING_RATIO = 0.1;

const cellKey = (cell: ScannedCell) => `${cell.icon}:${cell.count.value}`;

const rowKey = (row: ScannedRow) => row.cells.map(cellKey).join(",");

type Continuation = {
  previous: number;
  next: number;
  /** The first row of `next` that comes after `previous` */
  row: number;
  error: number;
};

/** The only item a cell can be, going by its icon. */
function soleId(cell: ScannedCell | undefined, catalog: ItemIconCatalog) {
  if (!cell || cell.uncertainIcon) {
    return null;
  }

  const { itemIds, consumableIds } = catalog.icons[cell.icon];

  return itemIds.length === 1 && consumableIds.length === 0 ? itemIds[0] : null;
}

const iconKey = (row: ScannedRow) => row.cells.map(({ icon }) => icon).join();

/**
 * The row of the next screenshot that shows the row the previous one cuts off.
 * Rows of look-alike items (tech notes of different schools) can match by
 * appearance alone, so the rows above it have to repeat the previous
 * screenshot's last ones.
 */
function matchCutOffRow(
  previous: ScannedScreenshot,
  cutOffRow: RowStrip,
  next: ScannedScreenshot,
) {
  const found = findRowStrip(
    cutOffRow,
    next.rows.map((row) => row.strip),
  );

  if (!found) {
    return null;
  }

  const repeated = previous.rows.slice(-found.row);

  return found.row === 0 ||
    (repeated.length === found.row &&
      repeated.every((row, i) => iconKey(row) === iconKey(next.rows[i])))
    ? found
    : null;
}

function findContinuation(
  previous: ScannedScreenshot,
  next: ScannedScreenshot,
  catalog: ItemIconCatalog,
) {
  if (previous.parcelType !== next.parcelType) {
    return null;
  }

  const lastRow = previous.rows.at(-1);
  const lastKey = lastRow && rowKey(lastRow);
  const overlap = next.rows.findIndex((row) => rowKey(row) === lastKey);

  const found =
    overlap !== -1
      ? {
          row: overlap + 1,
          error: 0,
        }
      : previous.cutOffRow &&
        matchCutOffRow(previous, previous.cutOffRow, next);

  // A screenshot that only repeats rows isn't a continuation
  if (!found || found.row >= next.rows.length) {
    return null;
  }

  const before = soleId(lastRow?.cells.at(-1), catalog);
  const after = soleId(next.rows[found.row].cells[0], catalog);

  return before !== null && after !== null && after < before ? null : found;
}

/** Follows the screenshots into stretches of the list without gaps. */
function buildRuns(
  screenshots: (ScannedScreenshot | null)[],
  catalog: ItemIconCatalog,
) {
  const candidates: Continuation[] = [];

  for (const [i, previous] of screenshots.entries()) {
    for (const [j, next] of screenshots.entries()) {
      if (!previous || !next || i === j || previous.listEnd) {
        continue;
      }

      const found = findContinuation(previous, next, catalog);

      if (found) {
        candidates.push({
          previous: i,
          next: j,
          ...found,
        });
      }
    }
  }

  candidates.sort((a, b) => a.error - b.error);

  const continuations = new Map<number, Continuation>();
  const continued = new Set<number>();

  const leadsTo = (from: number, to: number) => {
    for (
      let current: number | undefined = from;
      current !== undefined;
      current = continuations.get(current)?.next
    ) {
      if (current === to) {
        return true;
      }
    }

    return false;
  };

  for (const candidate of candidates) {
    if (
      !continuations.has(candidate.previous) &&
      !continued.has(candidate.next) &&
      !leadsTo(candidate.next, candidate.previous)
    ) {
      continuations.set(candidate.previous, candidate);
      continued.add(candidate.next);
    }
  }

  const runs: {
    cells: Cell[];
    reachesEnd: boolean;
    parcelType: ScanParcelType;
  }[] = [];

  for (const [start, first] of screenshots.entries()) {
    if (!first || continued.has(start)) {
      continue;
    }

    const cells: Cell[] = [];
    let current: number | undefined = start;
    let fromRow = 0;
    let reachesEnd = false;

    while (current !== undefined) {
      const screenshot = screenshots[current] as ScannedScreenshot;
      const index: number = current;

      for (const row of screenshot.rows.slice(fromRow)) {
        for (const cell of row.cells) {
          cells.push({
            ...cell,
            screenshot: index,
          });
        }
      }

      reachesEnd = screenshot.listEnd;
      const continuation = continuations.get(index);
      current = continuation?.next;
      fromRow = continuation?.row ?? 0;
    }

    runs.push({
      cells,
      reachesEnd,
      parcelType: first.parcelType,
    });
  }

  return runs;
}

/**
 * Accepts unclear icons that fit between their neighbors in the list, and
 * rejects ones that can't be there (when a touch effect covers an item).
 */
function confirmByOrder(cells: Cell[], catalog: ItemIconCatalog) {
  return cells.map((cell, i): Cell => {
    if (!cell.uncertainIcon) {
      return cell;
    }

    const before = soleId(cells[i - 1], catalog);
    const after = soleId(cells[i + 1], catalog);
    const own = soleId(
      {
        ...cell,
        uncertainIcon: false,
      },
      catalog,
    );

    if (before === null || after === null || before >= after) {
      return cell;
    }

    const { itemIds, consumableIds } = catalog.icons[cell.icon];
    const fits = [
      ...itemIds,
      ...consumableIds,
    ].some((id) => before < id && id < after);

    if (!fits) {
      return {
        ...cell,
        misplaced: true,
      };
    }

    return own !== null && before < own && own < after
      ? {
          ...cell,
          uncertainIcon: false,
        }
      : cell;
  });
}

/**
 * Whether each cell is in the first part of the list, with the boxes and other
 * consumables. A few share their icon with a normal item.
 */
function findConsumables(cells: Cell[], catalog: ItemIconCatalog) {
  const kinds = cells.map((cell) => {
    const { itemIds, consumableIds } = catalog.icons[cell.icon];

    if (
      cell.uncertainIcon ||
      (itemIds.length > 0 && consumableIds.length > 0)
    ) {
      return null;
    }

    return consumableIds.length > 0;
  });

  // Consumables come first, so whatever precedes one is one as well
  const lastConsumable = kinds.lastIndexOf(true);

  return kinds.map(
    (kind, i) =>
      kind ??
      (i < lastConsumable || catalog.icons[cells[i].icon].itemIds.length === 0),
  );
}

type Reading = {
  parcelType: ScanParcelType;
  itemId: number;
  cell: Cell;
  uncertain: boolean;
};

// A count read clearly this many times more often than all others combined
// outvotes them, as when a few frames of a video are blurred
const MAJORITY = 3;

/** Settles the count of an item from all its readings. */
function decide(readings: Reading[]): ScannedItem {
  const clear = readings.filter(
    ({ uncertain, cell }) => !uncertain && cell.count.value !== null,
  );
  const pool = clear.length > 0 ? clear : readings;

  const byValue = new Map<number | null, Reading[]>();

  for (const reading of pool) {
    const value = reading.cell.count.value;
    byValue.set(value, [
      ...(byValue.get(value) ?? []),
      reading,
    ]);
  }

  const score = (group: Reading[]) =>
    group.reduce((total, { cell }) => total + cell.count.score, 0);
  const [winner, ...others] = [
    ...byValue.values(),
  ].sort((a, b) => b.length - a.length || score(b) - score(a));
  const outvoted = others.reduce((total, group) => total + group.length, 0);

  const best = winner.reduce((a, b) =>
    b.cell.count.score > a.cell.count.score ? b : a,
  );

  return {
    parcelType: best.parcelType,
    itemId: best.itemId,
    value: best.cell.count.value,
    approximate: best.cell.count.approximate,
    uncertain: clear.length === 0,
    conflict: outvoted > 0 && winner.length < outvoted * MAJORITY,
    source: {
      screenshot: best.cell.screenshot,
      cell: best.cell,
    },
  };
}

type Gap = {
  parcelType: ScanParcelType;
  consumable: boolean;
  after: number;
  before: number;
};

export function mergeScreenshots(
  screenshots: (ScannedScreenshot | null)[],
  catalog: ItemIconCatalog,
): MergedInventory {
  const consumableIds = new Set(
    catalog.icons.flatMap((icon) => icon.consumableIds),
  );
  let ascending = 0;
  let descending = 0;
  const readings = new Map<string, Reading[]>();
  const gaps: Gap[] = [];
  const edges: RunEdge[] = [];
  const parcelTypes = new Set<ScanParcelType>();

  for (const { cells, reachesEnd, parcelType } of buildRuns(
    screenshots,
    catalog,
  )) {
    const run = {
      cells: confirmByOrder(cells, catalog),
      reachesEnd,
      parcelType,
    };
    const consumables = findConsumables(run.cells, catalog);
    parcelTypes.add(run.parcelType);

    const idsOf = (index: number) => {
      const icon = catalog.icons[run.cells[index].icon];
      return consumables[index] ? icon.consumableIds : icon.itemIds;
    };

    for (const consumable of [
      true,
      false,
    ]) {
      const known = run.cells
        .map((cell, i) => ({
          cell,
          ids: idsOf(i),
          consumable: consumables[i],
        }))
        .filter(
          (entry) =>
            entry.consumable === consumable &&
            !entry.cell.uncertainIcon &&
            entry.ids.length > 0,
        );
      const first = known.at(0);
      const last = known.at(-1);

      if (first && last) {
        edges.push({
          parcelType: run.parcelType,
          consumable,
          start: Math.min(...first.ids),
          end: Math.max(...last.ids),
          startScreenshot: first.cell.screenshot,
          endScreenshot: last.cell.screenshot,
        });
      }
    }

    for (const [i, cell] of run.cells.entries()) {
      const ids = idsOf(i);

      // Items that look the same as others can't be told apart, and the ones
      // planners ask for are always the first of them. Copies in the list of
      // consumables aren't those
      if (
        !cell.misplaced &&
        ids.length > 0 &&
        (ids.length === 1 || !consumables[i])
      ) {
        const itemId = ids[0];
        const key = `${run.parcelType}:${itemId}`;
        const reading: Reading = {
          parcelType: run.parcelType,
          itemId,
          cell,
          uncertain: cell.uncertainIcon || cell.uncertainCount,
        };

        readings.set(key, [
          ...(readings.get(key) ?? []),
          reading,
        ]);
      }

      if (cell.uncertainIcon) {
        continue;
      }

      const isLast = i === run.cells.length - 1;

      if (isLast) {
        if (run.reachesEnd && ids.length > 0 && !consumables[i]) {
          gaps.push({
            parcelType: run.parcelType,
            consumable: false,
            after: Math.max(...ids),
            before: Number.POSITIVE_INFINITY,
          });
        }

        continue;
      }

      const id = soleId(cell, catalog);
      const nextId = soleId(run.cells[i + 1], catalog);

      if (id !== null && nextId !== null) {
        if (id < nextId) {
          ascending++;
        } else {
          descending++;
        }
      }

      const nextIds = idsOf(i + 1);

      if (
        run.cells[i + 1].uncertainIcon ||
        consumables[i] !== consumables[i + 1] ||
        ids.length === 0 ||
        nextIds.length === 0
      ) {
        continue;
      }

      // For look-alikes, only what holds for all of them is certain
      const highest = Math.max(...nextIds);
      const lowest = Math.min(...ids);
      const after = Math.max(...ids.filter((id) => id < highest), -1);
      const before = Math.min(
        ...nextIds.filter((id) => id > lowest),
        Number.POSITIVE_INFINITY,
      );

      if (after !== -1 && Number.isFinite(before) && after < before) {
        gaps.push({
          parcelType: run.parcelType,
          consumable: consumables[i],
          after,
          before,
        });
      }
    }
  }

  const defaultOrder = descending <= ascending * MAX_DESCENDING_RATIO;

  const inGap = (parcelType: ScanParcelType, itemId: number) => {
    const consumable = parcelType === "Item" && consumableIds.has(itemId);

    return gaps.some(
      (gap) =>
        gap.parcelType === parcelType &&
        gap.consumable === consumable &&
        gap.after < itemId &&
        itemId < gap.before,
    );
  };

  const items = new Map(
    [
      ...readings,
    ]
      // Items only ever seen as unclear icons aren't there if clear readings
      // show that nothing is where they would be
      .filter(
        ([, itemReadings]) =>
          !itemReadings.every(({ cell }) => cell.uncertainIcon) ||
          !inGap(itemReadings[0].parcelType, itemReadings[0].itemId),
      )
      .map(([key, itemReadings]) => [
        key,
        decide(itemReadings),
      ]),
  );

  return {
    items: [
      ...items.values(),
    ],
    parcelTypes,
    defaultOrder,
    locateMissing: (parcelType, itemId) => {
      const consumable = parcelType === "Item" && consumableIds.has(itemId);
      const nearby = edges.filter(
        (edge) =>
          edge.parcelType === parcelType && edge.consumable === consumable,
      );
      const previous = nearby
        .filter((edge) => edge.end < itemId)
        .sort((a, b) => b.end - a.end)[0];
      const next = nearby
        .filter((edge) => edge.start > itemId)
        .sort((a, b) => a.start - b.start)[0];

      return {
        previous: previous?.endScreenshot ?? null,
        next: next?.startScreenshot ?? null,
      };
    },
    isAbsent: (parcelType, itemId) =>
      defaultOrder &&
      !items.has(`${parcelType}:${itemId}`) &&
      inGap(parcelType, itemId),
  };
}
