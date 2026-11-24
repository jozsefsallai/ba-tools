"use client";

import { CheckIcon, PencilIcon } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import bondImage from "@/assets/images/bond.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { FavorTableEntry } from "@/lib/favor-table";
import { cn } from "@/lib/utils";

export type BondProgressProps = {
  startingLevel: FavorTableEntry;
  currentLevel: FavorTableEntry;
  exp: number;
  targetBond: string;
  currentExp?: number;
  onCurrentExpChange?: (exp: number) => void;
};

export function BondProgress({
  startingLevel,
  currentLevel,
  exp,
  targetBond,
  currentExp,
  onCurrentExpChange,
}: BondProgressProps) {
  const t = useTranslations();
  const [draft, setDraft] = useState<string | null>(null);

  const canEdit =
    !!onCurrentExpChange &&
    typeof currentExp === "number" &&
    startingLevel.level < 100;

  function startEditing() {
    if (typeof currentExp !== "number") {
      return;
    }
    setDraft((currentExp - startingLevel.totalExp).toString());
  }

  function commit() {
    if (draft === null) {
      return;
    }

    const value = Number.parseInt(draft, 10);
    setDraft(null);

    if (Number.isNaN(value)) {
      return;
    }

    const clamped = Math.max(
      0,
      Math.min(value, startingLevel.expToNextLevel - 1),
    );
    onCurrentExpChange?.(startingLevel.totalExp + clamped);
  }

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
              (
              {t("tools.bond.progress.goal", {
                targetBond,
              })}
              )
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

      {draft !== null ? (
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">
            {t("tools.bond.progress.editing", {
              nextRank: startingLevel.level + 1,
            })}
          </span>

          <div className="flex items-center gap-2 text-lg">
            <Input
              type="number"
              min={0}
              max={startingLevel.expToNextLevel - 1}
              autoFocus
              className="w-24 text-center"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  commit();
                } else if (e.key === "Escape") {
                  setDraft(null);
                }
              }}
            />
            <span>/ {startingLevel.expToNextLevel}</span>

            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("tools.bond.progress.done")}
              onMouseDown={(e) => e.preventDefault()}
              onClick={commit}
            >
              <CheckIcon />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-lg text-center">
          {currentLevel.level !== 100 ? (
            <span>
              {exp - currentLevel.totalExp} / {currentLevel.expToNextLevel}
            </span>
          ) : (
            <span className="text-green-500 font-bold">MAX</span>
          )}

          {canEdit && (
            <Button
              variant="ghost"
              size="icon-xs"
              title={t("tools.bond.progress.edit")}
              aria-label={t("tools.bond.progress.edit")}
              onClick={startEditing}
            >
              <PencilIcon />
            </Button>
          )}
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
