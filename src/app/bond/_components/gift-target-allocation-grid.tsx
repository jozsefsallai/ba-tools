"use client";

import type { StudentWithGifts } from "@/app/bond/_lib/types";
import type { GiftTargetDoc } from "@/app/bond/_lib/gift-utils";
import bondImage from "@/assets/images/bond.png";
import { StudentCard } from "@/components/common/student-card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";
import type { ReactNode } from "react";
import type { Id } from "~convex/dataModel";

export type GiftTargetAllocationGridItem = {
  targetId: Id<"giftTarget">;
  student: StudentWithGifts;
  allocation: number;
  max: number;
  projectedRank: number;
  affinityIcon: ReactNode;
  onAllocationChange: (value: number) => void;
};

export type GiftTargetAllocationGridProps = {
  items: GiftTargetAllocationGridItem[];
  onTargetSelect?: (targetId: Id<"giftTarget">) => void;
};

function AllocationInput({
  value,
  max,
  ariaLabel,
  onChange,
}: {
  value: number;
  max: number;
  ariaLabel: string;
  onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const displayValue = draft ?? String(value);

  function commit(raw: string) {
    if (raw === "") {
      onChange(0);
      return;
    }

    const parsed = Number(raw);
    if (Number.isNaN(parsed)) {
      onChange(value);
      return;
    }

    onChange(Math.max(0, Math.min(parsed, max)));
  }

  return (
    <Input
      type="number"
      value={displayValue}
      min={0}
      max={max}
      aria-label={ariaLabel}
      onFocus={(e) => {
        setDraft(String(value));
        e.currentTarget.select();
      }}
      onBlur={() => {
        if (draft !== null) {
          commit(draft);
        }
        setDraft(null);
      }}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);

        if (raw === "") {
          return;
        }

        const parsed = Number(raw);
        if (Number.isNaN(parsed)) {
          return;
        }

        const clamped = Math.max(0, Math.min(parsed, max));
        setDraft(String(clamped));
        onChange(clamped);
      }}
      className={cn("w-full max-w-14 h-8 px-1 text-center no-arrows", {
        "border-green-200 shadow-green-200 focus-visible:ring-green-200/50 bg-green-200/10":
          value > 0,
      })}
    />
  );
}

export function GiftTargetAllocationGrid({
  items,
  onTargetSelect,
}: GiftTargetAllocationGridProps) {
  const t = useTranslations();

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(3.75rem,1fr))] gap-x-2 gap-y-3 border-t pt-4">
      {items.map(
        ({
          targetId,
          student,
          allocation,
          max,
          projectedRank,
          affinityIcon,
          onAllocationChange,
        }) => (
          <div
            key={targetId}
            className="flex flex-col items-center gap-1.5 min-w-0"
          >
            <button
              type="button"
              onClick={() => onTargetSelect?.(targetId)}
              disabled={!onTargetSelect}
              title={student.name}
              aria-label={student.name}
              className={cn(
                "relative inline-block leading-none rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                onTargetSelect && "cursor-pointer hover:opacity-90",
              )}
            >
              <div style={{ zoom: 0.55 }}>
                <StudentCard student={student} noDisplayRole />
              </div>
              <div className="absolute -top-2 -left-2 z-10 pointer-events-none [&_img]:size-6">
                {affinityIcon}
              </div>
            </button>

            <span
              className="flex items-center gap-0.5 text-sm font-bold tabular-nums leading-none"
              title={t("tools.bond.giftCard.projectedRank", {
                rank: projectedRank,
              })}
            >
              <Image
                src={bondImage}
                alt=""
                aria-hidden
                className="size-4 shrink-0"
              />
              {projectedRank}
            </span>

            <AllocationInput
              value={allocation}
              max={max}
              ariaLabel={student.name}
              onChange={onAllocationChange}
            />
          </div>
        ),
      )}
    </div>
  );
}

export type BuildGiftTargetGridItemsOptions = {
  targets: GiftTargetDoc[];
  studentMap: Map<string, StudentWithGifts>;
  getAllocation: (targetId: Id<"giftTarget">) => number;
  getMax: (targetId: Id<"giftTarget">) => number;
  getProjectedRank: (targetId: Id<"giftTarget">) => number;
  getAffinityIcon: (student: StudentWithGifts) => ReactNode;
  onAllocationChange: (targetId: Id<"giftTarget">, value: number) => void;
};

export function buildGiftTargetGridItems({
  targets,
  studentMap,
  getAllocation,
  getMax,
  getProjectedRank,
  getAffinityIcon,
  onAllocationChange,
}: BuildGiftTargetGridItemsOptions): GiftTargetAllocationGridItem[] {
  return targets.flatMap((target) => {
    const student = studentMap.get(target.studentId);
    if (!student) {
      return [];
    }

    const allocation = getAllocation(target._id);
    const max = getMax(target._id);

    return [
      {
        targetId: target._id,
        student,
        allocation,
        max,
        projectedRank: getProjectedRank(target._id),
        affinityIcon: getAffinityIcon(student),
        onAllocationChange: (value) => onAllocationChange(target._id, value),
      },
    ];
  });
}
