"use client";

import { Progress } from "@/components/ui/progress";
import { favorTable, type FavorTableEntry } from "@/lib/favor-table";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

export type BondProgressProps = {
  startingExp: number;
  exp: number;
};

export function BondProgress({ startingExp = 0, exp }: BondProgressProps) {
  const startingLevel = useMemo(() => {
    let result: FavorTableEntry | undefined;

    for (const entry of favorTable) {
      if (entry.totalExp > startingExp) {
        break;
      }

      result = entry;
    }

    if (result?.level === 101) {
      return favorTable[99];
    }

    return result ?? favorTable[0];
  }, [startingExp]);

  const nextLevel = useMemo(() => {
    let result: FavorTableEntry | undefined;

    for (const entry of favorTable) {
      result = entry;

      if (entry.totalExp > exp) {
        break;
      }
    }

    return result ?? favorTable[0];
  }, [exp]);

  const currentLevel = useMemo(() => {
    return (
      favorTable.find((entry) => entry.level === nextLevel.level - 1) ??
      favorTable[0]
    );
  }, [nextLevel]);

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="text-3xl font-bold">
        🩷{startingLevel.level} → 🩷{currentLevel.level}
      </div>

      <Progress
        indicatorClassName={cn({
          "bg-green-500": currentLevel.level === 100,
        })}
        value={
          currentLevel.level === 100
            ? 100
            : ((exp - currentLevel.totalExp) / currentLevel.expToNextLevel) *
              100
        }
      />

      {currentLevel.level !== 100 && (
        <div className="text-lg text-center">
          {exp - currentLevel.totalExp} / {currentLevel.expToNextLevel}
        </div>
      )}

      {currentLevel.level === 100 && (
        <div className="text-lg text-center">
          <span className="text-green-500 font-bold">MAX</span>
        </div>
      )}

      <div className="text-sm text-center text-muted-foreground">
        <strong>Total EXP:</strong> {exp}
      </div>
    </div>
  );
}
