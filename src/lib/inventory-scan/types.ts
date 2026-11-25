export type PixelImage = {
  width: number;
  height: number;
  /** RGBA */
  pixels: Uint8Array | Uint8ClampedArray;
};

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** The item grid's geometry in screenshot pixels. */
export type InventoryGrid = {
  panel: Rect;
  pitchX: number;
  pitchY: number;
  /** Centers of the columns, at the middle of a card */
  columns: number[];
  rows: GridRow[];
};

export type GridRow = {
  /** The middle of the cards */
  y: number;
  /** False for rows cut off by the panel's edges */
  complete: boolean;
};

export type ScanParcelType = "Item" | "Equipment";

export type IconMatch = {
  /** Index into the catalog's icons */
  icon: number;
  score: number;
  /** How clearly similar icons were ruled out, from 0 to 1 */
  margin: number;
};

export type CountReading = {
  /** Null when nothing readable was found */
  value: number | null;
  /** Set for counts the game shortens, e.g. "65K" */
  approximate: boolean;
  score: number;
};

export type ScannedCell = {
  /** Index into the catalog's icons */
  icon: number;
  count: CountReading;
  uncertainIcon: boolean;
  uncertainCount: boolean;
  /** The cell in the screenshot, for showing a crop of it */
  rect: Rect;
};

/** The upper part of a row, shrunk to a fixed size, for comparing rows. */
export type RowStrip = {
  /** How many lines of the strip are visible */
  lines: number;
  pixels: Uint8Array;
};

export type ScannedRow = {
  cells: ScannedCell[];
  strip: RowStrip;
};

export type ScannedScreenshot = {
  parcelType: ScanParcelType;
  /** Complete rows, top to bottom */
  rows: ScannedRow[];
  /** The row the panel's bottom edge cuts off */
  cutOffRow: RowStrip | null;
  /** The list ends in this screenshot */
  listEnd: boolean;
};
