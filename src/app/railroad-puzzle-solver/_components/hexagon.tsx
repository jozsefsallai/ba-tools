"use client";

import type { TileState } from "@/app/railroad-puzzle-solver/_lib/types";
import styles from "./hexagon.module.css";
import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";

export type HexagonProps = PropsWithChildren<{
  state: TileState;
}>;

export function Hexagon({ state, children }: HexagonProps) {
  return (
    <div
      className={cn(styles.railroadCell, {
        "bg-border": state.type === "TERRAIN",
        "bg-background": state.type === "EMPTY",
        "bg-type-blue text-white":
          state.type === "START" || state.type === "GOAL",
        "bg-type-red text-white": state.type === "STATION",
        "bg-green-600": state.type === "RAIL_PIECE",
      })}
    >
      <div className={cn(styles.railroadCellContent)}>{children}</div>
    </div>
  );
}
