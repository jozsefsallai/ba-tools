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
import { useTranslations } from "next-intl";

export type HexagonProps = PropsWithChildren<{
  state: TileState;
}>;

export function Hexagon({ state, children }: HexagonProps) {
  const t = useTranslations();

  const dir = (d: Direction) => {
    switch (d) {
      case "W":
        return t("tools.railroad.hexagon.directions.W");
      case "NE":
        return t("tools.railroad.hexagon.directions.NE");
      case "SE":
        return t("tools.railroad.hexagon.directions.SE");
      case "E":
        return t("tools.railroad.hexagon.directions.E");
      case "SW":
        return t("tools.railroad.hexagon.directions.SW");
      case "NW":
        return t("tools.railroad.hexagon.directions.NW");
    }
  };
  const railTypeLabel = (r: RailType) => {
    switch (r) {
      case "STRAIGHT":
        return t("tools.railroad.railTypes.straight");
      case "SLIGHTLY_CURVED":
        return t("tools.railroad.railTypes.slightlyCurved");
      case "VERY_CURVED":
        return t("tools.railroad.railTypes.veryCurved");
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger>
        <div
          className={cn(styles.railroadCell, {
            "bg-border": state.type === "TERRAIN",
            "bg-background": state.type === "EMPTY",
            "bg-type-blue text-white":
              state.type === "START" || state.type === "GOAL",
            "bg-type-red text-white":
              state.type === "STATION" || state.type === "STATION_RAIL_PIECE",
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
              <strong className="text-base">
                {t("tools.railroad.hexagon.startTile")}
              </strong>
              <br />
              {t("tools.railroad.hexagon.startTileDesc")}
              <br />
              {t("tools.railroad.hexagon.exitDirection")}{" "}
              <strong>{dir(state.exit)}</strong>
            </div>
          )}

          {state.type === "GOAL" && (
            <div className="text-center">
              <strong className="text-base">
                {t("tools.railroad.hexagon.goalTile")}
              </strong>
              <br />
              {t("tools.railroad.hexagon.goalTileDesc")}
              <br />
              {t("tools.railroad.hexagon.entranceDirection")}{" "}
              <strong>{dir(state.entrance)}</strong>
            </div>
          )}

          {state.type === "STATION" && (
            <div className="text-center">
              <strong className="text-base">
                {t("tools.railroad.hexagon.stationTile")}
              </strong>
              <br />
              {t.rich("tools.railroad.hexagon.stationTileDesc", {
                strong: (chunks) => <strong>{chunks}</strong>,
                railType: railTypeLabel(state.railType),
              })}
            </div>
          )}

          {state.type === "STATION_RAIL_PIECE" && (
            <div className="text-center">
              <strong className="text-base">
                {t("tools.railroad.hexagon.stationTile")}
              </strong>
              <br />
              {t.rich("tools.railroad.hexagon.stationTileWithDirections", {
                strong: (chunks) => <strong>{chunks}</strong>,
                br: () => <br />,
                entrance: dir(state.entrance),
                exit: dir(state.exit),
                railType: railTypeLabel(state.railType),
              })}
            </div>
          )}

          {state.type === "RAIL_PIECE" && (
            <div className="text-center">
              <strong className="text-base">
                {t("tools.railroad.hexagon.railPiece")}
              </strong>
              <br />
              {t.rich("tools.railroad.hexagon.railPieceDesc", {
                strong: (chunks) => <strong>{chunks}</strong>,
                br: () => <br />,
                entrance: dir(state.entrance),
                exit: dir(state.exit),
                railType: railTypeLabel(state.railType),
              })}
            </div>
          )}
        </TooltipContent>
      )}
    </Tooltip>
  );
}
