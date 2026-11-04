"use client";

import { CalendarIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { RaidInfo, RaidSeason } from "@/lib/raid-info";
import { DEFENSE_COLORS, getRaidBossLabel } from "@/lib/raid-labels";
import { getRaidArt } from "@/lib/roadmap/raid-images";
import { TERRAIN_ICONS } from "@/lib/terrain";
import { cn } from "@/lib/utils";

export function formatRaidDates(
  season: Pick<RaidSeason, "startDate" | "endDate">,
  locale: string,
) {
  const format = new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return format.formatRange(
    new Date(season.startDate),
    new Date(season.endDate),
  );
}

export function formatRaidDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

const DIFFICULTY_TEXT_CLASSES: Partial<
  Record<NonNullable<RaidInfo["difficulty"]>, string>
> = {
  Torment: "text-rose-600 dark:text-rose-400",
  Lunatic: "text-fuchsia-700 dark:text-fuchsia-400",
};

export function RaidSummary({
  raid,
  showDates,
  className,
}: {
  raid: RaidInfo;
  showDates?: boolean;
  className?: string;
}) {
  const t = useTranslations();
  const locale = useLocale();

  const art = getRaidArt(raid.type, raid.boss);
  const boss = getRaidBossLabel(t, raid.type, raid.boss);
  const type = t(`static.roadmap.raidTypes.${raid.type}`);

  return (
    <div
      className={cn(
        "relative flex w-full max-w-xl flex-col gap-3 overflow-hidden rounded-lg border bg-card p-4",
        className,
      )}
    >
      {art && (
        <img
          src={art.image.src}
          alt=""
          draggable={false}
          className="pointer-events-none absolute inset-y-0 right-0 h-full w-3/5 object-cover opacity-60 [mask-image:linear-gradient(to_right,transparent,black_70%)]"
        />
      )}

      <div className="relative min-w-0">
        <div className="truncate text-xl font-bold">{boss ?? type}</div>
        {boss && (
          <div className="truncate text-sm text-muted-foreground">{type}</div>
        )}
      </div>

      {(raid.defenseTypes ||
        raid.terrains ||
        raid.difficulty ||
        raid.floor !== undefined) && (
        <div className="relative flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium">
          {raid.defenseTypes?.map((type) => (
            <span key={type} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className={cn(
                  "size-2.5 rounded-full",
                  DEFENSE_COLORS[type] ?? "bg-slate-500",
                )}
              />
              {t(`common.defenseType.${type}`)}
            </span>
          ))}

          {raid.terrains?.map((terrain) => (
            <span key={terrain} className="flex items-center gap-1.5">
              <img
                src={TERRAIN_ICONS[terrain].src}
                alt=""
                draggable={false}
                className="size-4 rounded-[3px]"
              />
              {t(`common.terrain.${terrain}`)}
            </span>
          ))}

          {raid.difficulty && (
            <span className={DIFFICULTY_TEXT_CLASSES[raid.difficulty]}>
              {t(`common.difficulties.${raid.difficulty}`)}
            </span>
          )}

          {raid.floor !== undefined && <span>{`F${raid.floor}`}</span>}
        </div>
      )}

      {showDates && raid.season && (
        <div className="relative flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarIcon className="size-3.5 shrink-0" />
          <span>
            {t("tools.raidDetails.globalSeason", {
              dates: formatRaidDates(raid.season, locale),
            })}
          </span>
        </div>
      )}
    </div>
  );
}
