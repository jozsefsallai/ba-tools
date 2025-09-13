import type {
  Direction,
  Grid,
  RailConnection,
  RailType,
  Tile,
} from "@/app/railroad-puzzle-solver/_lib/types";

export const EVEN_Q_DELTAS: Record<
  Direction,
  [even: [dx: number, dy: number], odd: [dx: number, dy: number]]
> = {
  E: [
    [1, 0],
    [1, 0],
  ],
  W: [
    [-1, 0],
    [-1, 0],
  ],
  NE: [
    [0, -1],
    [1, -1],
  ],
  NW: [
    [-1, -1],
    [0, -1],
  ],
  SE: [
    [0, 1],
    [1, 1],
  ],
  SW: [
    [-1, 1],
    [0, 1],
  ],
};

export function getNeighbor(
  x: number,
  y: number,
  direction: Direction,
): [x: number, y: number] {
  const [dx, dy] = EVEN_Q_DELTAS[direction][y % 2];
  return [x + dx, y + dy];
}

function makeBidirectional(connections: RailConnection[]): RailConnection[] {
  const bidirectional: RailConnection[] = [];
  for (const [from, to] of connections) {
    bidirectional.push([from, to]);
  }

  // the separate for loop here is intentional
  for (const [from, to] of connections) {
    bidirectional.push([to, from]);
  }

  return bidirectional.filter(
    (conn, idx, arr) =>
      arr.findIndex(([a, b]) => a === conn[0] && b === conn[1]) === idx,
  );
}

export const RAIL_CONNECTIONS: Record<RailType, RailConnection[]> = {
  STRAIGHT: makeBidirectional([
    ["E", "W"],
    ["SE", "NW"],
    ["SW", "NE"],
  ]),
  SLIGHTLY_CURVED: makeBidirectional([
    ["E", "SW"],
    ["SE", "W"],
    ["SW", "NW"],
    ["W", "NE"],
    ["NW", "E"],
    ["NE", "SE"],
  ]),
  VERY_CURVED: makeBidirectional([
    ["E", "SE"],
    ["SE", "SW"],
    ["SW", "W"],
    ["W", "NW"],
    ["NW", "NE"],
    ["NE", "E"],
  ]),
};

export function isTilePlaceable(tile: Tile | undefined): boolean {
  return tile !== undefined && tile.state.type === "EMPTY";
}

export function findSpecialTiles(grid: Grid) {
  let start: Tile | null = null;
  let goal: Tile | null = null;

  const stations: Tile[] = [];

  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const tile = grid.tiles[y][x];

      if (tile.state.type === "START") {
        start = tile;
      } else if (tile.state.type === "GOAL") {
        goal = tile;
      } else if (tile.state.type === "STATION") {
        stations.push(tile);
      }
    }
  }

  return {
    start,
    goal,
    stations,
  };
}

export function reverseDirection(direction: Direction): Direction {
  switch (direction) {
    case "E":
      return "W";
    case "W":
      return "E";
    case "NE":
      return "SW";
    case "SW":
      return "NE";
    case "NW":
      return "SE";
    case "SE":
      return "NW";
  }
}
