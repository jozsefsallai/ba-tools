"use client";

import { useState, useEffect, type CSSProperties } from "react";
import { puzzles, type RailroadPuzzlePreset } from "../_lib/presets";

import { Hexagon } from "./hexagon";
import { cn } from "@/lib/utils";
import styles from "./hexagon.module.css";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type {
  RailPieceCountMap,
  RailType,
  Tile,
} from "@/app/railroad-puzzle-solver/_lib/types";
import {
  findShortestRailPaths,
  solveRailroadPuzzle,
} from "@/app/railroad-puzzle-solver/_lib/solver";
import { ResultTileArrow } from "@/app/railroad-puzzle-solver/_components/result-tile-arrow";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

const RAIL_TYPE_LABELS: Record<RailType, string> = {
  STRAIGHT: "Straight",
  SLIGHTLY_CURVED: "Slightly Curved",
  VERY_CURVED: "Very Curved",
};

type HexagonMapStyles = CSSProperties & {
  "--railroad-cell-height": string;
};

export function RailroadPuzzleView() {
  const [selectedPreset, setSelectedPreset] = useState<RailroadPuzzlePreset>(
    puzzles[0],
  );

  const [railInventory, setRailInventory] = useState<Record<RailType, number>>({
    STRAIGHT: 0,
    SLIGHTLY_CURVED: 0,
    VERY_CURVED: 0,
  });

  const [solveInstantly, setSolveInstantly] = useState(true);

  const [resultMap, setResultMap] = useState<Map<string, Tile>>(new Map());

  const [minRailConfigs, setMinRailConfigs] = useState<RailPieceCountMap[]>([]);

  useEffect(() => {
    setRailInventory(selectedPreset.defaultAvailableRails);
    setResultMap(new Map());
    setMinRailConfigs([]);
  }, [selectedPreset]);

  function handleRailCountChange(railType: RailType, count: number): void {
    setRailInventory((prev) => ({
      ...prev,
      [railType]: count,
    }));

    setResultMap(new Map());
  }

  function solve() {
    setResultMap(new Map());

    const result = solveRailroadPuzzle({
      grid: selectedPreset.grid,
      availableRails: railInventory,
    });

    if (!result) {
      return false;
    }

    const newResultMap = new Map<string, Tile>();

    for (const tile of result) {
      const key = `${tile.y},${tile.x}`;
      newResultMap.set(key, tile);
    }

    setResultMap(newResultMap);
    return true;
  }

  function handleSolveClick() {
    const solved = solve();
    if (!solved) {
      toast.error("No solution found with the given number of rails.");
      return;
    }
  }

  useEffect(() => {
    if (!solveInstantly) {
      return;
    }

    solve();
  }, [railInventory, solveInstantly]);

  function handleGetMinimalConfigsClick() {
    setMinRailConfigs([]);

    const solutions = findShortestRailPaths({
      grid: selectedPreset.grid,
      availableRails: selectedPreset.defaultAvailableRails,
    });

    const minResults: RailPieceCountMap[] = [];

    for (const solution of solutions) {
      const railCount: RailPieceCountMap = {
        STRAIGHT: 0,
        SLIGHTLY_CURVED: 0,
        VERY_CURVED: 0,
      };

      for (const tile of solution) {
        if (tile.state.type === "RAIL_PIECE") {
          railCount[tile.state.railType]++;
        }
      }

      if (
        !minResults.find(
          (r) =>
            r.STRAIGHT === railCount.STRAIGHT &&
            r.SLIGHTLY_CURVED === railCount.SLIGHTLY_CURVED &&
            r.VERY_CURVED === railCount.VERY_CURVED,
        )
      ) {
        minResults.push(railCount);
      }
    }

    setMinRailConfigs(minResults);
  }

  return (
    <div className="flex flex-col gap-8 items-center justify-center">
      <div
        className={cn(styles.railroadMap, "max-w-full overflow-x-auto")}
        style={{ "--railroad-cell-height": "75px" } as HexagonMapStyles}
      >
        {selectedPreset.grid.tiles.map((row, rowIndex) => (
          <div className={cn(styles.mapRow)} key={rowIndex}>
            {row.map((tile, colIndex) => {
              const key = `${rowIndex},${colIndex}`;
              const finalTile = resultMap.get(key) ?? tile;

              return (
                <Hexagon key={key} state={finalTile.state}>
                  <div className="flex flex-col items-center justify-center text-xs">
                    <div>{key}</div>

                    {finalTile.state.type === "START" && <div>START</div>}
                    {finalTile.state.type === "GOAL" && <div>GOAL</div>}
                    {finalTile.state.type === "STATION" && (
                      <ResultTileArrow tile={finalTile} />
                    )}

                    {finalTile.state.type === "RAIL_PIECE" && (
                      <ResultTileArrow tile={finalTile} />
                    )}
                  </div>
                </Hexagon>
              );
            })}
          </div>
        ))}
      </div>

      <Card className="w-full md:w-2/3 mx-auto">
        <CardContent>
          <div className="flex flex-col gap-8 md:gap-4">
            <div className="flex gap-2 items-center">
              <Label>Map</Label>
              <Select
                value={selectedPreset.name}
                onValueChange={(value) => {
                  const preset = puzzles.find((p) => p.name === value);
                  if (preset) {
                    setSelectedPreset(preset);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {puzzles.map((puzzle) => (
                    <SelectItem key={puzzle.name} value={puzzle.name}>
                      {puzzle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col md:flex-row md:flex-wrap md:gap-x-6 gap-y-4 md:items-center">
              <strong className="text-sm">Available rail pieces</strong>

              {Object.keys(railInventory).map((key) => {
                const railType = key as RailType;
                const maxRails = selectedPreset.defaultAvailableRails[railType];

                return (
                  <div className="flex gap-2 items-center" key={railType}>
                    <Label>{RAIL_TYPE_LABELS[railType]}</Label>
                    <div className="flex gap-1 items-center">
                      <Input
                        type="number"
                        min={0}
                        max={maxRails}
                        step={1}
                        value={railInventory[railType]?.toString()}
                        onChange={(e) =>
                          handleRailCountChange(
                            railType,
                            Math.min(
                              Math.max(0, Number.parseInt(e.target.value, 10)),
                              maxRails,
                            ),
                          )
                        }
                        className="w-16"
                      />

                      <div className="text-sm text-muted-foreground shrink-0">
                        / {maxRails}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 items-center">
              <Switch
                id="solve-instantly"
                checked={solveInstantly}
                onCheckedChange={setSolveInstantly}
              />

              <Label htmlFor="solve-instantly">Solve Instantly</Label>

              <div className="text-xs text-muted-foreground">
                (disable this if you experience lag)
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-center">
              <Button variant="outline" onClick={handleGetMinimalConfigsClick}>
                Get Minimal Rail Configs
              </Button>

              <Button onClick={handleSolveClick}>Solve!</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {minRailConfigs.length > 0 && (
        <Card className="md:w-2/3 mx-auto">
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="text-lg font-semibold">
                Minimal Rail Configurations ({minRailConfigs.length} found)
              </div>

              <div className="flex flex-col md:flex-row flex-wrap gap-4">
                {minRailConfigs.map((config, index) => (
                  <Button
                    variant="outline"
                    onClick={() => setRailInventory(config)}
                    key={index}
                    className="h-auto p-6 font-normal"
                  >
                    <div className="flex-1 flex flex-col gap-2">
                      {Object.keys(config).map((key) => {
                        const railType = key as RailType;

                        return (
                          <div
                            className="flex gap-2 items-center"
                            key={railType}
                          >
                            <span className="font-medium">
                              {RAIL_TYPE_LABELS[railType]}:
                            </span>

                            <span>{config[railType]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
