"use client";

import { Progress } from "@/components/ui/progress";
import type { FavorTableEntry } from "@/lib/favor-table";
import { cn } from "@/lib/utils";

import bondImage from "@/assets/images/bond.png";
import Image from "next/image";
import { useTranslations } from "next-intl";

export type BondProgressProps = {
  startingLevel: FavorTableEntry;
  currentLevel: FavorTableEntry;
  exp: number;
  targetBond: string;
};

export function BondProgress({
  startingLevel,
  currentLevel,
  exp,
  targetBond,
}: BondProgressProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="text-3xl font-bold flex items-start gap-2">
        <Image src={bondImage} alt="🩷" className="size-8 mt-1" />{" "}
        {startingLevel.level} →{" "}
        <Image src={bondImage} alt="🩷" className="size-8 mt-1" />{" "}
        <div className="flex flex-col">
          {currentLevel.level}

          {!!targetBond && (
            <small className="text-sm text-muted-foreground">
              ({t("tools.bond.progress.goal", { targetBond })})
            </small>
          )}
        </div>
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
        {t.rich("tools.bond.progress.total", {
          strong: (children) => <strong>{children}</strong>,
          exp,
        })}
      </div>
    </div>
  );
}
