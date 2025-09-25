import type {
  Direction,
  PuzzleConfig,
  RailPieceCountMap,
  RailType,
  Tile,
} from "@/app/railroad-puzzle-solver/_lib/types";
import {
  findSpecialTiles,
  getNeighbor,
  RAIL_CONNECTIONS,
  reverseDirection,
} from "@/app/railroad-puzzle-solver/_lib/utils";

type BFSState = {
  x: number;
  y: number;
  incoming: Direction | null;
  railsLeft: RailPieceCountMap;
  stationsVisited: Set<string>;
  path: Tile[];
};

function makeTileKey(tile: Tile): string {
  return `${tile.x},${tile.y}`;
}

export function solveRailroadPuzzle(config: PuzzleConfig): Tile[] | null {
  const { grid, availableRails } = config;
  const { start, goal, stations } = findSpecialTiles(grid);

  if (!start || !goal) {
    return null;
  }

  let solution: Tile[] | null = null;

  function dfs(
    gridState: Tile[][],
    x: number,
    y: number,
    incoming: Direction | null,
    railsLeft: RailPieceCountMap,
    stationsVisited: Set<string>,
    path: Tile[],
  ) {
    if (solution) {
      return;
    }

    const tile = gridState[y][x];

    let currentStationsVisited = stationsVisited;

    if (tile.state.type === "STATION") {
      if (!incoming || !tile.state.connections.includes(incoming)) {
        return;
      }

      currentStationsVisited = new Set(stationsVisited);
      currentStationsVisited.add(makeTileKey(tile));
    }

    if (tile.state.type === "GOAL") {
      if (
        tile.state.entrance === incoming &&
        currentStationsVisited.size === stations.length
      ) {
        solution = path;
      }

      return;
    }

    switch (tile.state.type) {
      case "START": {
        const [nx, ny] = getNeighbor(x, y, tile.state.exit);

        if (nx >= 0 && ny >= 0 && nx < grid.width && ny < grid.height) {
          dfs(
            gridState,
            nx,
            ny,
            reverseDirection(tile.state.exit),
            railsLeft,
            currentStationsVisited,
            path,
          );
        }
        break;
      }
      case "STATION": {
        const exitDir = tile.state.connections.find((d) => d !== incoming);

        if (!incoming || !exitDir) {
          return;
        }

        const railTile: Tile = {
          ...tile,
          state: {
            type: "STATION_RAIL_PIECE",
            railType: tile.state.railType,
            entrance: incoming,
            exit: exitDir,
          },
        };

        const [nx, ny] = getNeighbor(x, y, exitDir);

        if (nx >= 0 && ny >= 0 && nx < grid.width && ny < grid.height) {
          dfs(
            gridState,
            nx,
            ny,
            reverseDirection(exitDir),
            railsLeft,
            currentStationsVisited,
            [...path, railTile],
          );
        }

        break;
      }
      case "EMPTY": {
        if (!incoming) {
          return;
        }

        for (const railType of Object.keys(RAIL_CONNECTIONS) as RailType[]) {
          if (railsLeft[railType] <= 0) {
            continue;
          }

          for (const [inDir, outDir] of RAIL_CONNECTIONS[railType]) {
            if (incoming !== inDir) {
              continue;
            }

            const [nx, ny] = getNeighbor(x, y, outDir);

            if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) {
              continue;
            }

            const nextTile = gridState[ny][nx];
            const nextIncomingDir = reverseDirection(outDir);

            const isValidNextStep =
              nextTile.state.type === "EMPTY" ||
              (nextTile.state.type === "GOAL" &&
                nextTile.state.entrance === nextIncomingDir) ||
              (nextTile.state.type === "STATION" &&
                nextTile.state.connections.includes(nextIncomingDir));

            if (!isValidNextStep) {
              continue;
            }

            const newGridState = gridState.map((row) =>
              row.map((t) => ({ ...t, state: { ...t.state } })),
            );

            const placedTile: Tile = {
              ...newGridState[y][x],
              state: {
                type: "RAIL_PIECE",
                railType,
                entrance: inDir,
                exit: outDir,
              },
            };

            newGridState[y][x] = placedTile;

            const newRailsLeft = { ...railsLeft };
            newRailsLeft[railType]--;

            dfs(
              newGridState,
              nx,
              ny,
              nextIncomingDir,
              newRailsLeft,
              currentStationsVisited,
              [...path, placedTile],
            );

            if (solution) {
              return;
            }
          }
        }

        break;
      }
    }
  }

  dfs(
    grid.tiles.map((row) =>
      row.map((tile) => ({ ...tile, state: { ...tile.state } })),
    ),
    start.x,
    start.y,
    null,
    { ...availableRails },
    new Set(),
    [],
  );

  return solution;
}

export function findShortestRailPaths(config: PuzzleConfig): Tile[][] {
  const { grid, availableRails } = config;
  const { start, goal, stations } = findSpecialTiles(grid);

  if (!start || !goal) {
    return [];
  }

  const initialState: BFSState = {
    x: start.x,
    y: start.y,
    incoming: null,
    railsLeft: { ...availableRails },
    stationsVisited: new Set(),
    path: [],
  };

  const queue: BFSState[] = [initialState];
  const solutions: Tile[][] = [];
  let minPathLength: number | null = null;

  const visited = new Set<string>();

  function getVisitedKey(state: BFSState): string {
    const sortedRails = Object.entries(state.railsLeft)
      .map(([k, v]) => `${k}:${v}`)
      .join(",");

    const sortedStations = Array.from(state.stationsVisited).sort().join(",");
    return `${state.x},${state.y},${state.incoming},${sortedRails},${sortedStations}`;
  }

  visited.add(getVisitedKey(initialState));

  while (queue.length > 0) {
    // biome-ignore lint/style/noNonNullAssertion: while condition makes sure queue isnt empty
    const currentState = queue.shift()!;
    const { x, y, incoming, railsLeft, stationsVisited, path } = currentState;
    const tile = grid.tiles[y][x];

    let currentStationsVisited = stationsVisited;

    if (tile.state.type === "STATION") {
      if (!incoming || !tile.state.connections.includes(incoming)) {
        continue;
      }

      currentStationsVisited = new Set(stationsVisited);
      currentStationsVisited.add(makeTileKey(tile));
    }

    if (tile.state.type === "GOAL") {
      if (
        tile.state.entrance === incoming &&
        currentStationsVisited.size === stations.length
      ) {
        if (minPathLength === null) {
          minPathLength = path.length;
        }

        if (path.length === minPathLength) {
          solutions.push(path);
        }
      }

      continue;
    }

    if (minPathLength !== null && path.length >= minPathLength) {
      continue;
    }

    switch (tile.state.type) {
      case "START": {
        const { exit } = tile.state;
        const [nx, ny] = getNeighbor(x, y, exit);

        if (nx >= 0 && ny >= 0 && nx < grid.width && ny < grid.height) {
          const nextState: BFSState = {
            x: nx,
            y: ny,
            incoming: reverseDirection(exit),
            railsLeft,
            stationsVisited: currentStationsVisited,
            path,
          };

          const key = getVisitedKey(nextState);

          if (!visited.has(key)) {
            visited.add(key);
            queue.push(nextState);
          }
        }

        break;
      }
      case "STATION": {
        const exitDir = tile.state.connections.find((d) => d !== incoming);

        if (!exitDir || !incoming) {
          continue;
        }

        const [nx, ny] = getNeighbor(x, y, exitDir);

        if (nx >= 0 && ny >= 0 && nx < grid.width && ny < grid.height) {
          const railTile: Tile = {
            ...tile,
            state: {
              type: "STATION_RAIL_PIECE",
              railType: tile.state.railType,
              entrance: incoming,
              exit: exitDir,
            },
          };

          const nextState: BFSState = {
            x: nx,
            y: ny,
            incoming: reverseDirection(exitDir),
            railsLeft,
            stationsVisited: currentStationsVisited,
            path: [...path, railTile],
          };

          const key = getVisitedKey(nextState);

          if (!visited.has(key)) {
            visited.add(key);
            queue.push(nextState);
          }
        }

        break;
      }
      case "EMPTY": {
        if (!incoming) {
          continue;
        }

        for (const railType of Object.keys(RAIL_CONNECTIONS) as RailType[]) {
          if (railsLeft[railType] <= 0) {
            continue;
          }

          for (const [inDir, outDir] of RAIL_CONNECTIONS[railType]) {
            if (incoming !== inDir) {
              continue;
            }

            const [nx, ny] = getNeighbor(x, y, outDir);

            if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) {
              continue;
            }

            const nextTile = grid.tiles[ny][nx];
            const nextIncomingDir = reverseDirection(outDir);

            const isValid =
              nextTile.state.type === "EMPTY" ||
              (nextTile.state.type === "GOAL" &&
                nextTile.state.entrance === nextIncomingDir) ||
              (nextTile.state.type === "STATION" &&
                nextTile.state.connections.includes(nextIncomingDir));

            if (!isValid) {
              continue;
            }

            const newRailsLeft = { ...railsLeft };
            newRailsLeft[railType]--;

            const placedTile: Tile = {
              ...tile,
              state: {
                type: "RAIL_PIECE",
                railType,
                entrance: inDir,
                exit: outDir,
              },
            };

            const nextState: BFSState = {
              x: nx,
              y: ny,
              incoming: nextIncomingDir,
              railsLeft: newRailsLeft,
              stationsVisited: currentStationsVisited,
              path: [...path, placedTile],
            };

            const key = getVisitedKey(nextState);

            if (!visited.has(key)) {
              visited.add(key);
              queue.push(nextState);
            }
          }
        }
      }
    }
  }

  return solutions;
}
