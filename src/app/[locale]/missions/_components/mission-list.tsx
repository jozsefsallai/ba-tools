"use client";

import { SearchIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import {
  DropIcon,
  dropDisplay,
} from "@/app/[locale]/missions/_components/mission-drops";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import type { GameItemSummary } from "@/lib/data/game-items.server";
import type { MissionSummary } from "@/lib/data/missions.server";
import { gameItemKey } from "@/lib/game-items";
import { missionLabel } from "@/lib/missions/labels";
import { TERRAIN_ICONS } from "@/lib/terrain";
import { buildGameItemIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import type { MissionDifficulty } from "~prisma";

export function MissionList({
  missions,
  items,
}: {
  missions: MissionSummary[];
  items: GameItemSummary[];
}) {
  const t = useTranslations();
  const locale = useLocale();

  const [difficulty, setDifficulty] = useState<MissionDifficulty>("Normal");
  const [query, setQuery] = useState("");

  const itemMap = useMemo(
    () =>
      new Map(
        items.map((i) => [
          gameItemKey(i.parcelType, i.itemId),
          i,
        ]),
      ),
    [
      items,
    ],
  );

  const pyroxene = t("tools.missions.drops.pyroxene");

  const areas = useMemo(() => {
    const q = query.trim().toLowerCase();

    const matches = (m: MissionSummary) =>
      !q ||
      m.rewards.some((r) => {
        if (r.tag !== "Default" && r.tag !== "Rare") {
          return false;
        }

        const item = itemMap.get(gameItemKey(r.parcelType, r.parcelId));

        return [
          item?.name,
          item?.nameJP,
        ].some((n) => n?.toLowerCase().includes(q));
      });

    const byArea = new Map<number, MissionSummary[]>();

    for (const m of missions) {
      if (m.difficulty !== difficulty || !matches(m)) {
        continue;
      }

      byArea.set(m.chapter, [
        ...(byArea.get(m.chapter) ?? []),
        m,
      ]);
    }

    return [
      ...byArea.entries(),
    ].sort((a, b) => a[0] - b[0]);
  }, [
    missions,
    itemMap,
    difficulty,
    query,
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border p-0.5" role="tablist">
          {(
            [
              "Normal",
              "Hard",
            ] as const
          ).map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={difficulty === d}
              onClick={() => setDifficulty(d)}
              className={cn(
                "rounded px-3 py-1 text-sm font-medium",
                difficulty === d
                  ? d === "Hard"
                    ? "bg-primary text-primary-foreground"
                    : "bg-sky-600 text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`common.difficulties.${d}`)}
            </button>
          ))}
        </div>

        <div className="relative w-full max-w-xs">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("tools.missions.search")}
            aria-label={t("tools.missions.search")}
            className="pl-8"
          />
        </div>
      </div>

      {areas.length === 0 && (
        <p className="text-muted-foreground text-sm">
          {missions.length === 0
            ? t("tools.missions.empty")
            : t("tools.missions.noMatches")}
        </p>
      )}

      {areas.map(([area, rows]) => (
        <section key={area} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">
            {t("tools.missions.detail.area", {
              area,
            })}
          </h2>

          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5">
            {rows.map((m) => (
              <li key={m.id}>
                <MissionCard
                  mission={m}
                  drops={dropsOf(m, itemMap, locale, pyroxene)}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

type Drop = NonNullable<ReturnType<typeof dropDisplay>> & {
  probability: number;
};

function dropsOf(
  m: MissionSummary,
  itemMap: Map<string, GameItemSummary>,
  locale: string,
  pyroxene: string,
) {
  const drops = new Map<string, Drop>();

  for (const r of m.rewards) {
    if (r.tag !== "Default" && r.tag !== "Rare") {
      continue;
    }

    const display = dropDisplay(r, itemMap, locale, pyroxene);
    if (!display) {
      continue;
    }

    const key = gameItemKey(r.parcelType, r.parcelId);
    drops.set(key, {
      ...display,
      probability: Math.max(drops.get(key)?.probability ?? 0, r.probability),
    });
  }

  return [
    ...drops.values(),
  ];
}

function MissionCard({
  mission: m,
  drops,
}: {
  mission: MissionSummary;
  drops: Drop[];
}) {
  const t = useTranslations();

  const label = missionLabel(m);
  const hard = m.difficulty === "Hard";

  return (
    <Link
      href={`/missions/${label}`}
      className="bg-card group flex h-full flex-col gap-3 rounded-lg border p-3 transition-colors hover:border-sky-400 focus-visible:border-sky-400 dark:hover:border-sky-600"
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "font-nexon-football-gothic -skew-x-12 rounded-sm px-3 py-0.5 text-xl font-bold text-white tabular-nums",
            hard ? "bg-primary" : "bg-sky-600",
          )}
        >
          <span className="inline-block skew-x-12">{label}</span>
        </span>

        <span className="text-muted-foreground flex items-center gap-3 text-sm">
          <span
            className="flex items-center gap-1"
            title={t("tools.missions.fields.cost")}
          >
            <img
              src={buildGameItemIconUrl("Currency_Icon_AP")}
              alt={t("tools.missions.fields.cost")}
              className="size-5 object-contain"
            />

            <span className="font-nexon-football-gothic text-foreground text-base tabular-nums">
              {m.cost}
            </span>
          </span>

          <img
            src={TERRAIN_ICONS[m.terrain].src}
            alt={t(`common.terrain.${m.terrain}`)}
            title={t(`common.terrain.${m.terrain}`)}
            className="size-5"
          />

          <span title={t("tools.missions.fields.level")}>
            {t("tools.missions.card.level", {
              level: m.recommendedLevel,
            })}
          </span>
        </span>
      </div>

      <ul className="mt-auto flex flex-wrap gap-x-1.5 gap-y-1">
        {drops.map((d) => (
          <li
            key={d.iconName + d.name}
            className="flex w-10 flex-col items-center"
            title={`${d.name} ${Math.round(d.probability * 100)}%`}
          >
            <DropIcon
              iconName={d.iconName}
              rarity={d.rarity}
              alt={d.name}
              className="size-10"
            />

            <span className="font-nexon-football-gothic text-muted-foreground text-xs tabular-nums">
              {d.probability >= 1
                ? "\u00a0"
                : `${Math.round(d.probability * 100)}%`}
            </span>
          </li>
        ))}
      </ul>
    </Link>
  );
}
