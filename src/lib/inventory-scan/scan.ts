import { detectCountFont, readCellCount } from "@/lib/inventory-scan/counts";
import {
  CARD_HEIGHT,
  detectInventoryGrid,
  isCellOccupied,
} from "@/lib/inventory-scan/grid";
import { type IconTemplates, matchCellIcon } from "@/lib/inventory-scan/icons";
import { resample } from "@/lib/inventory-scan/resample";
import type {
  GridRow,
  InventoryGrid,
  PixelImage,
  RowStrip,
  ScannedRow,
  ScannedScreenshot,
  ScanParcelType,
} from "@/lib/inventory-scan/types";

const MIN_ICON_SCORE = 0.55;
const MIN_ICON_MARGIN = 0.2;
const MIN_COUNT_SCORE = 0.8;

// Row strips: the upper part of a row, shrunk to this many pixels
const STRIP_WIDTH = 160;
const STRIP_LINES = 18;
const STRIP_PITCH = 32;

// Lines a strip must have for a comparison to mean anything
const MIN_STRIP_LINES = 6;

// Highest difference between two strips of the same row
const MAX_STRIP_ERROR = 10;
const STRIP_ERROR_RATIO = 0.75;

// How much of an empty row has to be visible to call it the list's end
const MIN_END_HEIGHT = 0.3;

function readRowStrip(
  image: PixelImage,
  grid: InventoryGrid,
  row: GridRow,
): RowStrip {
  const step = grid.pitchY / STRIP_PITCH;
  const top = row.y - (grid.pitchY * CARD_HEIGHT) / 2;
  const left = grid.columns[0] - grid.pitchX / 2;
  const visible = grid.panel.y + grid.panel.height - step * 1.5 - top;

  const pixels = resample(image, left, top, step, STRIP_WIDTH, STRIP_LINES);

  return {
    lines: Math.max(0, Math.min(STRIP_LINES, Math.floor(visible / step))),
    pixels: Uint8Array.from(pixels),
  };
}

/** Mean difference between strips, in color levels; null if not comparable. */
export function rowStripError(a: RowStrip, b: RowStrip) {
  const lines = Math.min(a.lines, b.lines);

  if (lines < MIN_STRIP_LINES) {
    return null;
  }

  let best = Number.POSITIVE_INFINITY;

  // The rows may be off by a fraction of a line
  for (const shift of [
    -1,
    0,
    1,
  ]) {
    let total = 0;
    let count = 0;

    for (let y = 1; y < lines - 1; y++) {
      for (let i = 0; i < STRIP_WIDTH * 3; i++) {
        total += Math.abs(
          a.pixels[y * STRIP_WIDTH * 3 + i] -
            b.pixels[(y + shift) * STRIP_WIDTH * 3 + i],
        );
        count++;
      }
    }

    best = Math.min(best, total / count);
  }

  return best;
}

/** The row a cut off row continues as, if one clearly is the same. */
export function findRowStrip(strip: RowStrip, rows: RowStrip[]) {
  const errors = rows.map(
    (row) => rowStripError(strip, row) ?? Number.POSITIVE_INFINITY,
  );
  const error = Math.min(...errors);
  const row = errors.indexOf(error);

  // Rows of the same kind of item look alike at the top, so being close isn't
  // enough: no other row may be nearly as close
  const distinct = errors.every(
    (other, i) => i === row || error < other * STRIP_ERROR_RATIO,
  );

  return error <= MAX_STRIP_ERROR && distinct
    ? {
        row,
        error,
      }
    : null;
}

export function scanInventoryScreenshot(
  image: PixelImage,
  templates: IconTemplates,
): ScannedScreenshot | null {
  const grid = detectInventoryGrid(image);

  if (!grid) {
    return null;
  }

  const found: {
    row: GridRow;
    cells: {
      column: number;
      matches: ReturnType<typeof matchCellIcon>;
    }[];
  }[] = [];

  const panelBottom = grid.panel.y + grid.panel.height;
  let votes = 0;
  let listEnd = false;
  let cutOffRow: RowStrip | null = null;

  for (const row of grid.rows) {
    const columns = grid.columns.filter((column) =>
      isCellOccupied(image, grid, column, row),
    );

    const inLowerHalf = row.y > panelBottom - grid.panel.height / 2;
    const visible = panelBottom - (row.y - (grid.pitchY * CARD_HEIGHT) / 2);

    if (
      inLowerHalf &&
      visible > grid.pitchY * MIN_END_HEIGHT &&
      columns.length < grid.columns.length
    ) {
      listEnd = true;
    }

    if (columns.length === 0) {
      continue;
    }

    if (!row.complete) {
      if (inLowerHalf) {
        cutOffRow = readRowStrip(image, grid, row);
      }

      continue;
    }

    const cells = columns.map((column) => ({
      column,
      matches: matchCellIcon(image, grid, column, row.y, templates),
    }));

    for (const { matches } of cells) {
      votes +=
        (matches.Item?.score ?? 0) > (matches.Equipment?.score ?? 0) ? 1 : -1;
    }

    found.push({
      row,
      cells,
    });
  }

  // Items and equipment are never in the same list
  const parcelType: ScanParcelType = votes >= 0 ? "Item" : "Equipment";

  const font = detectCountFont(
    image,
    grid,
    found.flatMap(({ row, cells }) =>
      cells.map(({ column }) => ({
        column,
        rowY: row.y,
      })),
    ),
  );

  const rows = found.map(
    ({ row, cells }): ScannedRow => ({
      strip: readRowStrip(image, grid, row),
      cells: cells.flatMap(({ column, matches }) => {
        const match = matches[parcelType];

        if (!match) {
          return [];
        }

        const count = readCellCount(image, grid, column, row.y, font);

        return [
          {
            icon: match.icon,
            count,
            uncertainIcon:
              match.score < MIN_ICON_SCORE || match.margin < MIN_ICON_MARGIN,
            uncertainCount:
              count.value === null || count.score < MIN_COUNT_SCORE,
            rect: {
              x: column - grid.pitchX * 0.5,
              y: row.y - grid.pitchY * 0.48,
              width: grid.pitchX * 1.04,
              height: grid.pitchY * 0.96,
            },
          },
        ];
      }),
    }),
  );

  if (rows.length === 0) {
    return null;
  }

  return {
    parcelType,
    rows,
    cutOffRow,
    listEnd,
  };
}
