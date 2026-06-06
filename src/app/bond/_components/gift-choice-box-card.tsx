"use client";

import type { StudentWithGifts } from "@/app/bond/_lib/types";
import {
  GiftTargetAllocationGrid,
  buildGiftTargetGridItems,
} from "@/app/bond/_components/gift-target-allocation-grid";
import type { GiftTargetDoc } from "@/app/bond/_lib/gift-utils";
import { getRemainingBoxAllocatable } from "@/app/bond/_lib/gift-utils";
import giftLovedImage from "@/assets/images/gift_loved.png";
import { ItemCard } from "@/components/common/item-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useMemo } from "react";
import type { Id } from "~convex/dataModel";

export type GiftChoiceBoxCardProps = {
  inventoryTotal: number;
  targets: GiftTargetDoc[];
  studentMap: Map<string, StudentWithGifts>;
  boxAllocations: Record<Id<"giftTarget">, number>;
  onInventoryTotalChange: (value: number) => void;
  onAllocationChange: (targetId: Id<"giftTarget">, value: number) => void;
  onTargetSelect?: (targetId: Id<"giftTarget">) => void;
  targetProjectedRanks: Record<Id<"giftTarget">, number>;
};

export function GiftChoiceBoxCard({
  inventoryTotal,
  targets,
  studentMap,
  boxAllocations,
  onInventoryTotalChange,
  onAllocationChange,
  onTargetSelect,
  targetProjectedRanks,
}: GiftChoiceBoxCardProps) {
  const t = useTranslations();

  const sortedTargets = useMemo(() => {
    return [...targets].sort((a, b) => {
      const nameA = studentMap.get(a.studentId)?.name ?? a.studentId;
      const nameB = studentMap.get(b.studentId)?.name ?? b.studentId;
      return nameA.localeCompare(nameB);
    });
  }, [targets, studentMap]);

  const gridItems = useMemo(
    () =>
      buildGiftTargetGridItems({
        targets: sortedTargets,
        studentMap,
        getAllocation: (targetId) => boxAllocations[targetId] ?? 0,
        getMax: (targetId) =>
          getRemainingBoxAllocatable(inventoryTotal, boxAllocations, targetId),
        getProjectedRank: (targetId) => targetProjectedRanks[targetId] ?? 1,
        getAffinityIcon: () => (
          <Image
            src={giftLovedImage}
            alt={t("tools.bond.item.loved")}
            className="size-6 shrink-0"
          />
        ),
        onAllocationChange,
      }),
    [
      sortedTargets,
      studentMap,
      boxAllocations,
      inventoryTotal,
      onAllocationChange,
      targetProjectedRanks,
      t,
    ],
  );

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-col gap-4">
      <div className="flex gap-4 items-center">
        <ItemCard
          name={t("tools.bond.choiceBox.name")}
          iconName="item_icon_favor_selection"
          description={t("tools.bond.choiceBox.description")}
          rarity="SR"
          displayName={false}
          className="shrink-0"
        />

        <div className="flex-1 min-w-0 font-bold text-lg truncate">
          {t("tools.bond.choiceBox.name")}
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
