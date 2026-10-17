"use client";

import { useRoadmapTimeZone } from "@/components/roadmap/roadmap-time-zone";
import { isPermanent } from "@/lib/roadmap/constants";
import { intlTimeZone } from "@/lib/roadmap/time-zone";
import type {
  RoadmapCategory,
  RoadmapItem,
  RoadmapRaidItem,
} from "@/lib/roadmap/types";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import type { RaidBoss } from "~prisma";

export type RoadmapLabels = ReturnType<typeof useRoadmapLabels>;

export function useRoadmapLabels() {
  const t = useTranslations();
  const locale = useLocale();
  const tz = useRoadmapTimeZone();

  return useMemo(() => {
    const timeZone = intlTimeZone(tz);

    const zoneName =
      tz === "utc"
        ? "UTC"
        : (new Intl.DateTimeFormat(locale, { timeZoneName: "short" })
            .formatToParts(new Date())
            .find((part) => part.type === "timeZoneName")?.value ??
          t("static.roadmap.localTime"));

    const dateTimeFormat = new Intl.DateTimeFormat(locale, {
      timeZone,
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });

    const dateFormat = new Intl.DateTimeFormat(locale, {
      timeZone,
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    const monthFormat = new Intl.DateTimeFormat(locale, {
      timeZone,
      year: "numeric",
      month: "long",
    });

    const shortMonthFormat = new Intl.DateTimeFormat(locale, {
      timeZone,
      month: "short",
    });

    const weekdayFormat = new Intl.DateTimeFormat(locale, {
      timeZone,
      weekday: "narrow",
    });

    function raidName(item: RoadmapRaidItem): string {
      switch (item.type) {
        case "Raid":
        case "EliminateRaid":
          return item.raidBoss
            ? t(
                `common.raids.${item.raidBoss.toLowerCase() as Lowercase<RaidBoss>}`,
              )
            : t("static.roadmap.unknownBoss");
        case "MultiFloorRaid":
          return item.multiFloorRaidBoss
            ? t(
                `static.roadmap.multiFloorRaidBosses.${item.multiFloorRaidBoss}`,
              )
            : t("static.roadmap.unknownBoss");
        case "WorldRaid":
          return item.worldRaidBoss
            ? t(`static.roadmap.worldRaidBosses.${item.worldRaidBoss}`)
            : t("static.roadmap.unknownBoss");
        case "TimeAttackDungeon":
          return item.timeAttackDungeonType
            ? t(
                `static.roadmap.timeAttackDungeonTypes.${item.timeAttackDungeonType}`,
              )
            : t("static.roadmap.unknownBoss");
      }
    }

    function category(kind: RoadmapCategory): string {
      return t(`static.roadmap.categories.${kind}`);
    }

    function title(item: RoadmapItem): string {
      switch (item.kind) {
        case "banner":
          return (
            item.name ?? item.students.map((student) => student.name).join(", ")
          );
        case "raid":
        case "frr":
          return raidName(item);
        case "event":
        case "story":
        case "workLog":
        case "battlePass":
          return item.name;
        case "bonus":
          return t("static.roadmap.bonusTitle", {
            multiplier: item.bonusMultiply,
            type: t(`static.roadmap.bonusTypes.${item.type}`),
          });
        case "birthday":
          return item.students.map((student) => student.name).join(", ");
        case "shopReset":
          return t("static.roadmap.shopReset");
        case "etc":
          return item.label;
      }
    }

    function subtitle(item: RoadmapItem): string | null {
      switch (item.kind) {
        case "raid":
          return t(`static.roadmap.raidTypes.${item.type}`);
        case "event":
          return t(`static.roadmap.eventTypes.${item.type}`);
        case "story":
          return t(`static.roadmap.scenarioTypes.${item.type}`);
        default:
          return null;
      }
    }

    function fullTitle(item: RoadmapItem): string {
      const sub = subtitle(item);
      return sub ? `${sub}: ${title(item)}` : title(item);
    }

    function formatDateTime(date: string | Date): string {
      return dateTimeFormat.format(new Date(date));
    }

    function dateRange(item: RoadmapItem): string {
      if (item.kind === "birthday") {
        return dateFormat.format(new Date(item.startDate));
      }

      if (
        item.kind === "shopReset" ||
        isPermanent(item.startDate, item.endDate)
      ) {
        return t("static.roadmap.from", {
          date: formatDateTime(item.startDate),
        });
      }

      return `${formatDateTime(item.startDate)} – ${formatDateTime(item.endDate)}`;
    }

    return {
      t,
      tz,
      zoneName,
      category,
      title,
      subtitle,
      fullTitle,
      dateRange,
      formatDateTime,
      formatDate: (date: string | Date) => dateFormat.format(new Date(date)),
      formatMonth: (date: string | Date) => monthFormat.format(new Date(date)),
      formatShortMonth: (date: string | Date) =>
        shortMonthFormat.format(new Date(date)),
      formatWeekday: (date: string | Date) =>
        weekdayFormat.format(new Date(date)),
    };
  }, [t, locale, tz]);
}
