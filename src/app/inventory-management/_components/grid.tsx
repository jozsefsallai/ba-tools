"use client";

import { Tile } from "@/app/inventory-management/_components/tile";
import type { InventoryManagementResult } from "@/workers/types";
import { useEffect, useState } from "react";

export type DisplayedItem = 1 | 2 | 3;

export type BlockedCoords = {
  x: number;
  y: number;
};

export type SelectRegion = {
  width: number;
  height: number;
};

export type GridProps = {
  probabilities?: NonNullable<InventoryManagementResult["result"]>;
  displayedItem?: DisplayedItem;
  blockedCells: BlockedCoords[];
  onWantsToBlockCell?: (coords: BlockedCoords) => void;
  onWantsToUnblockCell?: (coords: BlockedCoords) => void;
  selectRegion?: SelectRegion;
};

type GridItem = {
  value?: number;
  blocked?: boolean;
  hovered?: boolean;
};

type GridConfig = Array<Array<GridItem>>;

function generateInitialGrid() {
  const width = 9;
  const height = 5;

  const grid: GridConfig = [];
  for (let i = 0; i < height; i++) {
    const row = [];
    for (let j = 0; j < width; j++) {
      row.push({ blocked: false });
    }
    grid.push(row);
  }

  return grid;
}

export function Grid({
  probabilities,
  displayedItem,
  blockedCells,
  onWantsToBlockCell,
  onWantsToUnblockCell,
  selectRegion = { width: 1, height: 1 },
}: GridProps) {
  const [grid, setGrid] = useState<GridConfig>([]);
  const [maxValue, setMaxValue] = useState<number | null>(null);

  useEffect(() => {
    setGrid((oldGrid) => {
      if (!probabilities) {
        return generateInitialGrid();
      }

      const newGrid = oldGrid.map((row) => [...row]);

      for (let y = 0; y < probabilities.length; y++) {
        for (let x = 0; x < probabilities[y].length; x++) {
          if (!newGrid[y][x]) {
            continue;
          }

          if (displayedItem) {
            newGrid[y][x].value =
              probabilities[y][x].itemTypes[displayedItem - 1];
          } else {
            newGrid[y][x].value = probabilities[y][x].total;
          }
        }
      }

      return newGrid;
    });
  }, [probabilities, displayedItem]);

  useEffect(() => {
    setMaxValue(() => {
      let max = 0;

      for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
          if (typeof grid[y][x].value === "undefined") {
            continue;
          }

          max = Math.max(max, grid[y][x].value ?? 0);
        }
      }

      return max === 0 ? null : max;
    });
  }, [grid]);

  useEffect(() => {
    setGrid((oldGrid) => {
      const newGrid = oldGrid.map((row) => [...row]);

      for (let y = 0; y < newGrid.length; y++) {
        for (let x = 0; x < newGrid[y].length; x++) {
          newGrid[y][x].blocked = blockedCells.some(
            (cell) => cell.x === x && cell.y === y,
          );
        }
      }

      return newGrid;
    });
  }, [blockedCells]);

  function is1x1Region() {
    return selectRegion.width === 1 && selectRegion.height === 1;
  }

  function toggleGridItem(x: number, y: number) {
    if (grid[y][x].blocked && is1x1Region()) {
      onWantsToUnblockCell?.({ x, y });
    } else {
      onWantsToBlockCell?.({ x, y });
    }
  }

  function onHover(fromX: number, fromY: number) {
    setGrid((oldGrid) => {
      const newGrid = oldGrid.map((row) => [...row]);

      for (let y = 0; y < newGrid.length; y++) {
        for (let x = 0; x < newGrid[y].length; x++) {
          newGrid[y][x].hovered = false;
        }
      }

      for (let y = fromY; y < fromY + selectRegion.height; y++) {
        for (let x = fromX; x < fromX + selectRegion.width; x++) {
          if (newGrid[y]?.[x]) {
            newGrid[y][x].hovered = true;
          }
        }
      }

      return newGrid;
    });
  }

  function onUnhover() {
    setGrid((oldGrid) => {
      const newGrid = oldGrid.map((row) => [...row]);

      for (let y = 0; y < newGrid.length; y++) {
        for (let x = 0; x < newGrid[y].length; x++) {
          newGrid[y][x].hovered = false;
        }
      }

      return newGrid;
    });
  }

  return (
    <div className="flex flex-col gap-2 md:gap-1">
      {grid.map((row, y) => (
        <div key={y} className="flex gap-2 md:gap-1">
          {row.map((item, x) => (
            <Tile
              key={x}
              value={item.value ?? undefined}
              blocked={item.blocked}
              highlight={item.value === maxValue}
              hovered={item.hovered}
              onClick={() => toggleGridItem(x, y)}
              onHover={() => onHover(x, y)}
              onUnhover={onUnhover}
              isMultiSelect={!is1x1Region()}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
