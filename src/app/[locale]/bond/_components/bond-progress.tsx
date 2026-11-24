"use client";

import { PencilIcon } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import bondImage from "@/assets/images/bond.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const canEdit =
    !!onCurrentExpChange &&
    typeof currentExp === "number" &&
    startingLevel.level < 100;

  function handleOpenChange(next: boolean) {
    if (next && typeof currentExp === "number") {
      setDraft((currentExp - startingLevel.totalExp).toString());
    }
    setOpen(next);
  }

  function handleDraftChange(raw: string) {
    const value = Number.parseInt(raw, 10);
    if (Number.isNaN(value)) {
      setDraft(raw);
      return;
    }

    const clamped = Math.max(
      0,
      Math.min(value, startingLevel.expToNextLevel - 1),
    );
    setDraft(clamped === value ? raw : clamped.toString());
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

      <div className="flex items-center gap-1 text-lg text-center">
        {currentLevel.level !== 100 ? (
          <span>
            {exp - currentLevel.totalExp} / {currentLevel.expToNextLevel}
          </span>
        ) : (
          <span className="text-green-500 font-bold">MAX</span>
        )}

        {canEdit && (
          <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                title={t("tools.bond.progress.edit")}
                aria-label={t("tools.bond.progress.edit")}
              >
                <PencilIcon />
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-auto flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">
                {t("tools.bond.progress.editing", {
                  nextRank: startingLevel.level + 1,
                })}
              </span>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={startingLevel.expToNextLevel - 1}
                  className="w-24"
                  value={draft}
                  onChange={(e) => handleDraftChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setOpen(false);
                    }
                  }}
                />
                <span>/ {startingLevel.expToNextLevel}</span>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="text-sm text-center text-muted-foreground">
        {t.rich("tools.bond.progress.total", {
          strong: (children) => <strong>{children}</strong>,
          exp,
        })}
      </div>
    </div>
  );
}
