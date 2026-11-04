"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { RaidInfo } from "@/lib/raid-info";
import { DEFENSE_COLORS } from "@/lib/raid-labels";
import { TERRAIN_ICONS } from "@/lib/terrain";
import { cn } from "@/lib/utils";
import type { DefenseType, Terrain } from "~prisma";

export function RaidChip({
  className,
  children,
  title,
}: {
  className?: string;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs leading-4 font-semibold whitespace-nowrap",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function DefenseChip({
  type,
  className,
}: {
  type: DefenseType;
  className?: string;
}) {
  const t = useTranslations();

  return (
    <RaidChip
      className={cn(
        "text-white",
        DEFENSE_COLORS[type] ?? "bg-slate-500",
        className,
      )}
      title={`${t("static.roadmap.defense")}: ${t(`common.defenseType.${type}`)}`}
    >
      {t(`common.defenseType.${type}`)}
    </RaidChip>
  );
}

export function TerrainChip({ terrain }: { terrain: Terrain }) {
  const t = useTranslations();

  return (
    <RaidChip
      className="border bg-background text-foreground"
      title={`${t("static.roadmap.terrain")}: ${t(`common.terrain.${terrain}`)}`}
    >
      <img
        src={TERRAIN_ICONS[terrain].src}
        alt=""
        draggable={false}
        className="size-3.5 rounded-[3px]"
      />
      {t(`common.terrain.${terrain}`)}
    </RaidChip>
  );
}

const DIFFICULTY_CLASSES: Partial<
  Record<NonNullable<RaidInfo["difficulty"]>, string>
> = {
  Torment: "bg-rose-600 text-white",
  Lunatic: "bg-fuchsia-700 text-white",
};

export function RaidChips({
  raid,
  hideType,
  className,
}: {
  raid: RaidInfo;
  hideType?: boolean;
  className?: string;
}) {
  const t = useTranslations();

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {!hideType && (
        <RaidChip className="bg-muted text-foreground">
          {t(`static.roadmap.raidTypes.${raid.type}`)}
        </RaidChip>
      )}

      {raid.defenseTypes?.map((type) => (
        <DefenseChip key={type} type={type} />
      ))}

      {raid.terrains?.map((terrain) => (
        <TerrainChip key={terrain} terrain={terrain} />
      ))}

      {raid.difficulty && (
        <RaidChip
          className={
            DIFFICULTY_CLASSES[raid.difficulty] ??
            "border bg-background text-foreground"
          }
        >
          {t(`common.difficulties.${raid.difficulty}`)}
        </RaidChip>
      )}

      {raid.floor !== undefined && (
        <RaidChip className="border bg-background text-foreground">
          {`F${raid.floor}`}
        </RaidChip>
      )}
    </div>
  );
}
