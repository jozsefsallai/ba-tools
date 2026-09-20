export const DIRECTIONS = ["E", "SE", "SW", "W", "NW", "NE"] as const;

export type Direction = (typeof DIRECTIONS)[number];

export type RailType = "STRAIGHT" | "SLIGHTLY_CURVED" | "VERY_CURVED";

export type RailConnection = [from: Direction, to: Direction];

export type TileState =
  | { type: "EMPTY" }
  | { type: "START"; exit: Direction }
  | { type: "GOAL"; entrance: Direction }
  | {
      type: "STATION";
      railType: RailType;
      connections: Direction[];
    }
  | {
      type: "STATION_RAIL_PIECE";
      railType: RailType;
      entrance: Direction;
      exit: Direction;
    }
  | { type: "TERRAIN" }
  | {
      type: "RAIL_PIECE";
      railType: RailType;
      entrance: Direction;
      exit: Direction;
    };

export type Tile = {
  x: number;
  y: number;
  state: TileState;
};

export type RailPiece = {
  type: RailType;
  used: boolean;
};

export type Grid = {
  width: number;
  height: number;
  tiles: Tile[][];
};

export type RailPieceCountMap = {
  [key in RailType]: number;
};

export type PuzzleConfig = {
  grid: Grid;
  availableRails: RailPieceCountMap;
};
