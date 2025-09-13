import type { Grid, RailPieceCountMap, Tile, TileState } from "./types";

type RailroadPuzzlePresetBuilderOpts = {
  name: string;
  grid: number[][];
  specialTiles: Tile[];
  defaultAvailableRails: RailPieceCountMap;
};

export type RailroadPuzzlePreset = {
  name: string;
  grid: Grid;
  defaultAvailableRails: RailPieceCountMap;
};

function magicNumberToTileType(num: number): TileState["type"] {
  switch (num) {
    case 0:
      return "EMPTY";
    case 1:
      return "START";
    case 2:
      return "GOAL";
    case 3:
      return "STATION";
    case 4:
      return "TERRAIN";
    default:
      throw new Error(`Unknown tile type number: ${num}`);
  }
}

function buildPreset(
  opts: RailroadPuzzlePresetBuilderOpts,
): RailroadPuzzlePreset {
  const height = opts.grid.length;
  const width = opts.grid[0].length;

  const tiles: Tile[][] = [];

  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];

    for (let x = 0; x < width; x++) {
      const cellValue = opts.grid[y][x];
      const cellType = magicNumberToTileType(cellValue);

      switch (cellType) {
        case "EMPTY":
        case "TERRAIN":
          row.push({ x, y, state: { type: cellType } });
          break;
        case "START":
        case "GOAL":
        case "STATION": {
          const specialTile = opts.specialTiles.find(
            (t) => t.x === x && t.y === y && t.state.type === cellType,
          );

          if (!specialTile) {
            throw new Error(
              `Missing special tile definition for ${cellType} at (${x},${y})`,
            );
          }

          row.push(specialTile);
          break;
        }
      }
    }

    tiles.push(row);
  }

  return {
    name: opts.name,
    grid: {
      width,
      height,
      tiles,
    },
    defaultAvailableRails: opts.defaultAvailableRails,
  };
}

export const puzzles: RailroadPuzzlePreset[] = [
  buildPreset({
    name: "Round 1",
    grid: [
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 1, 0, 0, 0, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 3, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 0, 4, 0, 0, 0, 2, 4],
      [4, 4, 4, 0, 4, 0, 4, 4, 4, 4, 4],
      [4, 4, 4, 0, 4, 4, 3, 4, 4, 4, 4],
      [4, 4, 4, 0, 0, 3, 0, 4, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    ],
    specialTiles: [
      {
        x: 1,
        y: 2,
        state: { type: "START", exit: "E" },
      },
      {
        x: 9,
        y: 4,
        state: { type: "GOAL", entrance: "W" },
      },
      {
        x: 4,
        y: 3,
        state: {
          type: "STATION",
          railType: "SLIGHTLY_CURVED",
          entrance: "NW",
          exit: "SW",
        },
      },
      {
        x: 6,
        y: 6,
        state: {
          type: "STATION",
          railType: "STRAIGHT",
          entrance: "SE",
          exit: "NW",
        },
      },
      {
        x: 5,
        y: 7,
        state: {
          type: "STATION",
          railType: "STRAIGHT",
          entrance: "W",
          exit: "E",
        },
      },
    ],
    defaultAvailableRails: {
      STRAIGHT: 7,
      SLIGHTLY_CURVED: 5,
      VERY_CURVED: 1,
    },
  }),
  buildPreset({
    name: "Round 2",
    grid: [
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 0, 0, 4, 4, 0, 0, 0, 4, 4],
      [4, 2, 0, 4, 0, 4, 0, 4, 4, 0, 4],
      [4, 4, 4, 0, 4, 0, 4, 0, 0, 4, 4],
      [4, 1, 0, 4, 3, 0, 4, 0, 3, 4, 4],
      [4, 4, 0, 4, 4, 4, 4, 0, 4, 4, 4],
      [4, 4, 0, 4, 0, 0, 3, 4, 0, 4, 4],
      [4, 3, 4, 0, 4, 0, 0, 4, 0, 4, 4],
      [4, 4, 0, 0, 4, 4, 4, 0, 0, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    ],
    specialTiles: [
      {
        x: 1,
        y: 4,
        state: { type: "START", exit: "E" },
      },
      {
        x: 1,
        y: 2,
        state: { type: "GOAL", entrance: "E" },
      },
      {
        x: 4,
        y: 4,
        state: {
          type: "STATION",
          railType: "SLIGHTLY_CURVED",
          entrance: "E",
          exit: "NW",
        },
      },
      {
        x: 8,
        y: 4,
        state: {
          type: "STATION",
          railType: "VERY_CURVED",
          entrance: "W",
          exit: "NW",
        },
      },
      {
        x: 6,
        y: 6,
        state: {
          type: "STATION",
          railType: "VERY_CURVED",
          entrance: "W",
          exit: "SW",
        },
      },
      {
        x: 1,
        y: 7,
        state: {
          type: "STATION",
          railType: "SLIGHTLY_CURVED",
          entrance: "NE",
          exit: "SE",
        },
      },
    ],
    defaultAvailableRails: {
      STRAIGHT: 8,
      SLIGHTLY_CURVED: 19,
      VERY_CURVED: 3,
    },
  }),
  buildPreset({
    name: "Round 3",
    grid: [
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 1, 0, 0, 4, 4, 0, 0, 0, 4, 4],
      [4, 4, 4, 0, 4, 0, 0, 4, 4, 0, 4],
      [4, 4, 4, 0, 0, 4, 4, 3, 0, 4, 4],
      [4, 4, 4, 4, 4, 4, 0, 0, 4, 2, 4],
      [4, 4, 0, 0, 0, 0, 4, 4, 4, 0, 4],
      [4, 4, 0, 4, 4, 3, 4, 0, 0, 0, 4],
      [4, 4, 0, 0, 4, 0, 4, 0, 4, 4, 4],
      [4, 4, 4, 4, 0, 0, 3, 0, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    ],
    specialTiles: [
      {
        x: 1,
        y: 1,
        state: { type: "START", exit: "E" },
      },
      {
        x: 9,
        y: 4,
        state: { type: "GOAL", entrance: "SE" },
      },
      {
        x: 7,
        y: 3,
        state: {
          type: "STATION",
          railType: "SLIGHTLY_CURVED",
          entrance: "E",
          exit: "SW",
        },
      },
      {
        x: 5,
        y: 6,
        state: {
          type: "STATION",
          railType: "VERY_CURVED",
          entrance: "NE",
          exit: "NW",
        },
      },
      {
        x: 6,
        y: 8,
        state: {
          type: "STATION",
          railType: "SLIGHTLY_CURVED",
          entrance: "NW",
          exit: "E",
        },
      },
    ],
    defaultAvailableRails: {
      STRAIGHT: 5,
      SLIGHTLY_CURVED: 22,
      VERY_CURVED: 3,
    },
  }),
  buildPreset({
    name: "Round 4",
    grid: [
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 0, 0, 0, 4, 0, 4, 4, 4, 4],
      [4, 2, 0, 4, 0, 4, 0, 0, 0, 4, 4],
      [4, 4, 4, 0, 3, 0, 4, 0, 4, 4, 4],
      [4, 1, 0, 4, 4, 4, 4, 0, 3, 4, 4],
      [4, 4, 0, 4, 0, 0, 4, 0, 4, 4, 4],
      [4, 4, 0, 4, 0, 0, 3, 4, 0, 4, 4],
      [4, 3, 4, 0, 4, 0, 0, 0, 0, 4, 4],
      [4, 4, 0, 0, 0, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    ],
    specialTiles: [
      {
        x: 1,
        y: 4,
        state: { type: "START", exit: "E" },
      },
      {
        x: 1,
        y: 2,
        state: { type: "GOAL", entrance: "E" },
      },
      {
        x: 4,
        y: 3,
        state: {
          type: "STATION",
          railType: "STRAIGHT",
          entrance: "E",
          exit: "W",
        },
      },
      {
        x: 8,
        y: 4,
        state: {
          type: "STATION",
          railType: "VERY_CURVED",
          entrance: "W",
          exit: "NW",
        },
      },
      {
        x: 6,
        y: 6,
        state: {
          type: "STATION",
          railType: "VERY_CURVED",
          entrance: "W",
          exit: "SW",
        },
      },
      {
        x: 1,
        y: 7,
        state: {
          type: "STATION",
          railType: "SLIGHTLY_CURVED",
          entrance: "NE",
          exit: "SE",
        },
      },
    ],
    defaultAvailableRails: {
      STRAIGHT: 10,
      SLIGHTLY_CURVED: 10,
      VERY_CURVED: 10,
    },
  }),
  buildPreset({
    name: "Round 5",
    grid: [
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 0, 0, 4, 4, 4, 4, 4],
      [4, 0, 0, 3, 0, 4, 0, 3, 4, 4, 4],
      [4, 0, 0, 0, 0, 0, 0, 4, 4, 4, 4],
      [4, 4, 4, 0, 4, 0, 0, 4, 4, 4, 4],
      [4, 4, 0, 0, 0, 0, 0, 4, 4, 4, 4],
      [4, 1, 0, 0, 3, 0, 0, 0, 4, 4, 4],
      [4, 4, 0, 0, 0, 4, 0, 4, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 0, 2, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    ],
    specialTiles: [
      {
        x: 1,
        y: 6,
        state: { type: "START", exit: "E" },
      },
      {
        x: 8,
        y: 8,
        state: { type: "GOAL", entrance: "W" },
      },
      {
        x: 3,
        y: 2,
        state: {
          type: "STATION",
          railType: "STRAIGHT",
          entrance: "W",
          exit: "E",
        },
      },
      {
        x: 7,
        y: 2,
        state: {
          type: "STATION",
          railType: "VERY_CURVED",
          entrance: "W",
          exit: "SW",
        },
      },
      {
        x: 4,
        y: 6,
        state: {
          type: "STATION",
          railType: "SLIGHTLY_CURVED",
          entrance: "W",
          exit: "SE",
        },
      },
    ],
    defaultAvailableRails: {
      STRAIGHT: 4,
      SLIGHTLY_CURVED: 17,
      VERY_CURVED: 9,
    },
  }),
  buildPreset({
    name: "Round 6",
    grid: [
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 2, 4, 4],
      [4, 1, 0, 0, 4, 4, 3, 0, 0, 4, 4],
      [4, 4, 0, 4, 4, 4, 0, 0, 4, 4, 4],
      [4, 4, 0, 0, 4, 4, 0, 0, 0, 4, 4],
      [4, 0, 0, 0, 0, 0, 0, 3, 4, 4, 4],
      [4, 4, 0, 0, 0, 4, 0, 0, 0, 4, 4],
      [4, 0, 0, 0, 4, 4, 3, 0, 4, 4, 4],
      [4, 4, 0, 0, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    ],
    specialTiles: [
      {
        x: 1,
        y: 2,
        state: { type: "START", exit: "E" },
      },
      {
        x: 8,
        y: 1,
        state: { type: "GOAL", entrance: "SW" },
      },
      {
        x: 6,
        y: 2,
        state: {
          type: "STATION",
          railType: "VERY_CURVED",
          entrance: "SE",
          exit: "E",
        },
      },
      {
        x: 7,
        y: 5,
        state: {
          type: "STATION",
          railType: "SLIGHTLY_CURVED",
          entrance: "W",
          exit: "NE",
        },
      },
      {
        x: 6,
        y: 7,
        state: {
          type: "STATION",
          railType: "SLIGHTLY_CURVED",
          entrance: "NW",
          exit: "E",
        },
      },
    ],
    defaultAvailableRails: {
      STRAIGHT: 7,
      SLIGHTLY_CURVED: 13,
      VERY_CURVED: 10,
    },
  }),
  buildPreset({
    name: "Round 7+ (Variant 1 - Top left to bottom left)",
    grid: [
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 0, 0, 0, 4, 4, 4, 4],
      [4, 1, 0, 0, 0, 0, 0, 0, 4, 4, 4],
      [4, 0, 4, 0, 3, 4, 4, 4, 4, 4, 4],
      [4, 0, 0, 0, 4, 0, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 4, 0, 0, 4, 4, 4, 4],
      [4, 4, 4, 4, 3, 4, 0, 0, 0, 4, 4],
      [4, 2, 0, 0, 0, 0, 0, 3, 4, 4, 4],
      [4, 4, 4, 0, 0, 0, 0, 0, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    ],
    specialTiles: [
      {
        x: 1,
        y: 2,
        state: { type: "START", exit: "E" },
      },
      {
        x: 1,
        y: 7,
        state: { type: "GOAL", entrance: "E" },
      },
      {
        x: 4,
        y: 3,
        state: {
          type: "STATION",
          railType: "SLIGHTLY_CURVED",
          entrance: "NE",
          exit: "SE",
        },
      },
      {
        x: 4,
        y: 6,
        state: {
          type: "STATION",
          railType: "VERY_CURVED",
          entrance: "SE",
          exit: "SW",
        },
      },
      {
        x: 7,
        y: 7,
        state: {
          type: "STATION",
          railType: "STRAIGHT",
          entrance: "NE",
          exit: "SW",
        },
      },
    ],
    defaultAvailableRails: {
      STRAIGHT: 7,
      SLIGHTLY_CURVED: 12,
      VERY_CURVED: 11,
    },
  }),
  buildPreset({
    name: "Round 7+ (Variant 2 - Bottom left to top right, station on bottom half)",
    grid: [
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 0, 0, 4, 4, 4, 4, 4, 2, 4, 4],
      [4, 4, 0, 0, 4, 4, 4, 4, 0, 4, 4],
      [4, 4, 0, 0, 4, 4, 0, 3, 4, 4, 4],
      [4, 4, 3, 0, 0, 4, 0, 0, 4, 4, 4],
      [4, 0, 4, 4, 0, 4, 0, 0, 4, 4, 4],
      [4, 0, 0, 4, 4, 0, 0, 3, 0, 4, 4],
      [4, 0, 0, 4, 0, 0, 4, 0, 0, 4, 4],
      [4, 1, 4, 4, 4, 0, 4, 4, 0, 0, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    ],
    specialTiles: [
      {
        x: 1,
        y: 8,
        state: { type: "START", exit: "NE" },
      },
      {
        x: 8,
        y: 1,
        state: { type: "GOAL", entrance: "SW" },
      },
      {
        x: 2,
        y: 4,
        state: {
          type: "STATION",
          railType: "SLIGHTLY_CURVED",
          entrance: "SW",
          exit: "E",
        },
      },
      {
        x: 7,
        y: 3,
        state: {
          type: "STATION",
          railType: "SLIGHTLY_CURVED",
          entrance: "W",
          exit: "NE",
        },
      },
      {
        x: 7,
        y: 6,
        state: {
          type: "STATION",
          railType: "STRAIGHT",
          entrance: "NW",
          exit: "SE",
        },
      },
    ],
    defaultAvailableRails: {
      STRAIGHT: 14,
      SLIGHTLY_CURVED: 8,
      VERY_CURVED: 8,
    },
  }),
  buildPreset({
    name: "Round 7+ (Variant 3 - Bottom left to top right, station on top row)",
    grid: [
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 0, 3, 4, 4, 4, 4, 2, 4, 4],
      [4, 4, 0, 4, 0, 4, 4, 0, 0, 4, 4],
      [4, 0, 4, 4, 0, 4, 0, 0, 4, 4, 4],
      [4, 0, 3, 0, 0, 0, 0, 3, 4, 4, 4],
      [4, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4],
      [4, 0, 4, 4, 0, 4, 0, 4, 4, 4, 4],
      [4, 0, 4, 0, 4, 4, 0, 4, 4, 4, 4],
      [4, 1, 4, 0, 0, 0, 0, 0, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    ],
    specialTiles: [
      {
        x: 1,
        y: 8,
        state: { type: "START", exit: "NE" },
      },
      {
        x: 8,
        y: 1,
        state: { type: "GOAL", entrance: "SW" },
      },
      {
        x: 2,
        y: 4,
        state: {
          type: "STATION",
          railType: "STRAIGHT",
          entrance: "E",
          exit: "W",
        },
      },
      {
        x: 3,
        y: 1,
        state: {
          type: "STATION",
          railType: "SLIGHTLY_CURVED",
          entrance: "W",
          exit: "SE",
        },
      },
      {
        x: 7,
        y: 4,
        state: {
          type: "STATION",
          railType: "SLIGHTLY_CURVED",
          entrance: "W",
          exit: "NE",
        },
      },
    ],
    defaultAvailableRails: {
      STRAIGHT: 13,
      SLIGHTLY_CURVED: 12,
      VERY_CURVED: 5,
    },
  }),
  buildPreset({
    name: "Round 7+ (Variant 4 - Bottom left to bottom right, two stations on top tow)",
    grid: [
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 0, 4, 4, 4, 4],
      [4, 4, 3, 0, 0, 3, 0, 0, 0, 0, 4],
      [4, 0, 0, 4, 4, 4, 4, 0, 0, 4, 4],
      [4, 4, 4, 0, 4, 4, 4, 4, 0, 4, 4],
      [4, 4, 0, 4, 4, 4, 4, 3, 4, 4, 4],
      [4, 4, 0, 0, 0, 4, 0, 0, 0, 0, 4],
      [4, 0, 0, 0, 4, 4, 0, 0, 0, 4, 4],
      [4, 1, 4, 4, 4, 4, 0, 0, 0, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 2, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    ],
    specialTiles: [
      {
        x: 1,
        y: 8,
        state: { type: "START", exit: "NE" },
      },
      {
        x: 8,
        y: 9,
        state: { type: "GOAL", entrance: "NW" },
      },
      {
        x: 2,
        y: 2,
        state: {
          type: "STATION",
          railType: "SLIGHTLY_CURVED",
          entrance: "SW",
          exit: "E",
        },
      },
      {
        x: 5,
        y: 2,
        state: {
          type: "STATION",
          railType: "STRAIGHT",
          entrance: "W",
          exit: "E",
        },
      },
      {
        x: 7,
        y: 5,
        state: {
          type: "STATION",
          railType: "STRAIGHT",
          entrance: "NE",
          exit: "SW",
        },
      },
    ],
    defaultAvailableRails: {
      STRAIGHT: 10,
      SLIGHTLY_CURVED: 11,
      VERY_CURVED: 9,
    },
  }),
  buildPreset({
    name: "Round 7+ (Variant 5 - Bottom left to bottom right, one station on top row)",
    grid: [
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 4, 3, 4, 4, 4, 4, 4],
      [4, 4, 4, 0, 0, 0, 0, 4, 4, 4, 4],
      [4, 4, 3, 0, 0, 4, 0, 4, 4, 4, 4],
      [4, 4, 0, 4, 0, 4, 0, 4, 4, 4, 4],
      [4, 0, 0, 4, 4, 0, 4, 4, 0, 4, 4],
      [4, 0, 0, 0, 4, 4, 0, 3, 0, 0, 4],
      [4, 0, 0, 0, 4, 4, 0, 0, 0, 4, 4],
      [4, 1, 4, 0, 0, 4, 0, 0, 4, 2, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
      [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
    ],
    specialTiles: [
      {
        x: 1,
        y: 8,
        state: { type: "START", exit: "NE" },
      },
      {
        x: 9,
        y: 8,
        state: { type: "GOAL", entrance: "NW" },
      },
      {
        x: 2,
        y: 3,
        state: {
          type: "STATION",
          railType: "STRAIGHT",
          entrance: "SW",
          exit: "NE",
        },
      },
      {
        x: 5,
        y: 1,
        state: {
          type: "STATION",
          railType: "VERY_CURVED",
          entrance: "SW",
          exit: "SE",
        },
      },
      {
        x: 7,
        y: 6,
        state: {
          type: "STATION",
          railType: "VERY_CURVED",
          entrance: "W",
          exit: "SW",
        },
      },
    ],
    defaultAvailableRails: {
      STRAIGHT: 11,
      SLIGHTLY_CURVED: 12,
      VERY_CURVED: 7,
    },
  }),
];
