"use client";

import type {
  GiftWithStudents,
  StudentWithGifts,
} from "@/app/bond/_lib/types";
import {
  GiftAffinityIcon,
  GiftInfo,
  GiftItemCard,
} from "@/app/bond/_components/gift-info";
import {
  GiftTargetAllocationGrid,
  buildGiftTargetGridItems,
} from "@/app/bond/_components/gift-target-allocation-grid";
import {
  type GiftTargetDoc,
  getRemainingAllocatable,
  sortTargetsByGiftAffinity,
} from "@/app/bond/_lib/gift-utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import type { Id } from "~convex/dataModel";

export type GiftAllocationCardProps = {
  gift: GiftWithStudents;
  inventoryTotal: number;
  targets: GiftTargetDoc[];
  studentMap: Map<string, StudentWithGifts>;
  targetAllocations: Record<Id<"giftTarget">, Record<number, number>>;
  onInventoryTotalChange: (value: number) => void;
  onAllocationChange: (
    targetId: Id<"giftTarget">,
    giftId: number,
    value: number,
  ) => void;
  onTargetSelect?: (targetId: Id<"giftTarget">) => void;
  selectedStudent?: StudentWithGifts | null;
  targetProjectedRanks: Record<Id<"giftTarget">, number>;
};

export function GiftAllocationCard({
  gift,
  inventoryTotal,
  targets,
  studentMap,
  targetAllocations,
  onInventoryTotalChange,
  onAllocationChange,
  onTargetSelect,
  selectedStudent,
  targetProjectedRanks,
}: GiftAllocationCardProps) {
  const t = useTranslations();
  const locale = useLocale();

  const giftName = useMemo(() => {
    switch (locale) {
      case "en":
        return gift.name;
      case "jp":
        return gift.nameJP || gift.name;
    }
  }, [gift, locale]);

  const sortedTargets = useMemo(
    () => sortTargetsByGiftAffinity(gift, targets, studentMap),
    [gift, targets, studentMap],
  );

  const gridItems = useMemo(
    () =>
      buildGiftTargetGridItems({
        targets: sortedTargets,
        studentMap,
        getAllocation: (targetId) =>
          targetAllocations[targetId]?.[gift.id] ?? 0,
        getMax: (targetId) =>
          getRemainingAllocatable(
            inventoryTotal,
            targetAllocations,
            gift.id,
            targetId,
          ),
        getProjectedRank: (targetId) => targetProjectedRanks[targetId] ?? 1,
        getAffinityIcon: (student) => (
          <GiftAffinityIcon gift={gift} student={student} />
        ),
        onAllocationChange: (targetId, value) =>
          onAllocationChange(targetId, gift.id, value),
      }),
    [
      sortedTargets,
      studentMap,
      targetAllocations,
      gift,
      inventoryTotal,
      onAllocationChange,
      targetProjectedRanks,
    ],
  );

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-4">
      <div className="flex gap-4 items-center">
        <Popover>
          <PopoverTrigger className="shrink-0 relative">
            {selectedStudent && targets.length === 0 && (
              <div className="absolute -top-3 -right-3 z-10 pointer-events-none">
                <GiftAffinityIcon
                  gift={gift}
                  student={selectedStudent}
                  className="size-8 shrink-0"
                />
              </div>
            )}
            <GiftItemCard gift={gift} />
          </PopoverTrigger>

          <PopoverContent className="w-[90vw] md:w-[450px] ring-4 max-h-[500px] overflow-y-auto shadow-lg ring-black/75 dark:ring-white/75 p-0">
            <GiftInfo gift={gift} />
          </PopoverContent>
        </Popover>

        <div className="flex-1 min-w-0 font-bold text-lg truncate">
          {giftName}
        </div>

        <div className="flex flex-col gap-1 items-end shrink-0">
          <Label className="text-xs">{t("tools.bond.giftCard.total")}</Label>
          <Input
            type="number"
            value={inventoryTotal}
            min={0}
            onClick={(e) => {
              e.currentTarget.select();
            }}
            onChange={(e) => {
              const value = Number(e.target.value);
              onInventoryTotalChange(
                Number.isNaN(value) ? 0 : Math.max(0, value),
              );
            }}
            className={cn("w-16 no-arrows", {
              "border-green-200 shadow-green-200 focus-visible:ring-green-200/50 bg-green-200/10":
                inventoryTotal > 0,
            })}
          />
        </div>
      </div>

      <GiftTargetAllocationGrid
        items={gridItems}
        onTargetSelect={onTargetSelect}
      />
    </div>
  );
}
