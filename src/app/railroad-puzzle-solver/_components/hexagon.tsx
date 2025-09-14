"use client";

import type {
  Direction,
  RailType,
  TileState,
} from "@/app/railroad-puzzle-solver/_lib/types";
import styles from "./hexagon.module.css";
import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type HexagonProps = PropsWithChildren<{
  state: TileState;
}>;

function prettyPrintDirection(direction: Direction) {
  switch (direction) {
    case "W":
      return "West";
    case "NE":
      return "Northeast";
    case "SE":
      return "Southeast";
    case "E":
      return "East";
    case "SW":
      return "Southwest";
    case "NW":
      return "Northwest";
  }
}

function prettyPrintRailType(railType: RailType) {
  switch (railType) {
    case "STRAIGHT":
      return "Straight";
    case "SLIGHTLY_CURVED":
      return "Slightly Curved";
    case "VERY_CURVED":
      return "Very Curved";
  }
}

export function Hexagon({ state, children }: HexagonProps) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <div
          className={cn(styles.railroadCell, {
            "bg-border": state.type === "TERRAIN",
            "bg-background": state.type === "EMPTY",
            "bg-type-blue text-white":
              state.type === "START" || state.type === "GOAL",
            "bg-type-red text-white": state.type === "STATION",
            "bg-green-600 text-white": state.type === "RAIL_PIECE",
          })}
        >
          <div className={cn(styles.railroadCellContent)}>{children}</div>
        </div>
      </TooltipTrigger>

      {state.type !== "EMPTY" && state.type !== "TERRAIN" && (
        <TooltipContent>
          {state.type === "START" && (
            <div className="text-center">
              <strong className="text-base">Start Tile</strong>
              <br />
              This is where the train will depart from.
              <br />
              Exit direction:{" "}
              <strong>{prettyPrintDirection(state.exit)}</strong>
            </div>
          )}

          {state.type === "GOAL" && (
            <div className="text-center">
              <strong className="text-base">Goal Tile</strong>
              <br />
              This is where the train needs to arrive.
              <br />
              Entrance direction:{" "}
              <strong>{prettyPrintDirection(state.entrance)}</strong>
            </div>
          )}

          {state.type === "STATION" && (
            <div className="text-center">
              <strong className="text-base">Station Tile</strong>
              <br />
              The train must pass through this tile
              <br />
              from <strong>{prettyPrintDirection(state.entrance)}</strong> to{" "}
              <strong>{prettyPrintDirection(state.exit)}</strong>
              <br />
              through a <strong>{prettyPrintRailType(state.railType)}</strong>{" "}
              piece.
            </div>
          )}

          {state.type === "RAIL_PIECE" && (
            <div className="text-center">
              <strong className="text-base">Rail Piece</strong>
              <br />
              Connects a tile from{" "}
              <strong>{prettyPrintDirection(state.entrance)}</strong> to{" "}
              <strong>{prettyPrintDirection(state.exit)}</strong>
              <br />
              through a <strong>{prettyPrintRailType(state.railType)}</strong>{" "}
              piece.
            </div>
          )}
        </TooltipContent>
      )}
    </Tooltip>
  );
}
