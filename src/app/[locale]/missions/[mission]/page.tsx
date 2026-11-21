import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import type { PropsWithChildren } from "react";
import { MissionBreadcrumbs } from "@/app/[locale]/missions/_components/mission-breadcrumbs";
import { MissionDrops } from "@/app/[locale]/missions/_components/mission-drops";
import { MissionRoute } from "@/app/[locale]/missions/_components/mission-route";
import { Link } from "@/i18n/navigation";
import { getGameItems } from "@/lib/data/game-items.server";
import {
  getMission,
  getMissionNeighbours,
  listMissions,
} from "@/lib/data/missions.server";
import { gameItemKey } from "@/lib/game-items";
import { missionLabel, parseMissionLabel } from "@/lib/missions/labels";
import { OG_DESIGN_VERSION } from "@/lib/og/registry";
import { localizedPath, sharingMetadata } from "@/lib/og-metadata.server";
import { TERRAIN_ICONS } from "@/lib/terrain";
import { buildGameItemIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";

export const revalidate = 86_400;

type PageParams = {
  mission: string;
};

export async function generateStaticParams(): Promise<PageParams[]> {
  const missions = await listMissions();
  return missions.map((m) => ({
    mission: missionLabel(m),
  }));
}

async function loadMission(param: string) {
  const where = parseMissionLabel(decodeURIComponent(param));
  return where ? await getMission(where) : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const mission = await loadMission((await params).mission);
  if (!mission) {
    return {};
  }

  const t = await getTranslations();
  const locale = await getLocale();

  const label = missionLabel(mission);

  return sharingMetadata({
    title: t("common.sharing.title", {
      title: t("tools.missions.detail.title", {
        label,
      }),
      appName: t("common.appName"),
    }),
    description: t("tools.missions.detail.metaDescription", {
      label,
    }),
    image: `${localizedPath(`/missions/${encodeURIComponent(label)}/opengraph-image`, locale)}?v=${OG_DESIGN_VERSION}`,
    locale,
    alt: label,
  });
}

export default async function MissionPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const mission = await loadMission((await params).mission);
  if (!mission) {
    notFound();
  }

  const t = await getTranslations();
  const locale = await getLocale();

  const label = missionLabel(mission);

  const [items, neighbours] = await Promise.all([
    getGameItems([
      "Item",
      "Equipment",
    ]),
    getMissionNeighbours(mission.id),
  ]);

  const itemMap = new Map(
    items.map((i) => [
      gameItemKey(i.parcelType, i.itemId),
      i,
    ]),
  );

  const hard = mission.difficulty === "Hard";

  return (
    <MissionBreadcrumbs label={label}>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <h1
                className={cn(
                  "font-nexon-football-gothic -skew-x-12 rounded-sm px-4 py-1 text-3xl font-bold text-white tabular-nums",
                  hard ? "bg-primary" : "bg-sky-600",
                )}
              >
                <span className="inline-block skew-x-12">{label}</span>
                <span className="sr-only">
                  {` ${t(`common.difficulties.${mission.difficulty}`)}`}
                </span>
              </h1>

              <div className="flex flex-col">
                <span
                  aria-hidden
                  className={cn(
                    "text-sm font-semibold",
                    hard
                      ? "text-primary dark:text-purple-300"
                      : "text-sky-700 dark:text-sky-300",
                  )}
                >
                  {t(`common.difficulties.${mission.difficulty}`)}
                </span>

                <span className="text-muted-foreground text-sm">
                  {t("tools.missions.detail.area", {
                    area: mission.chapter,
                  })}
                  {locale !== "ja" &&
                    !mission.isReleasedGlobal &&
                    ` ${t("tools.missions.notOnGlobal")}`}
                </span>
              </div>
            </div>

            <nav className="flex gap-2 text-sm">
              {neighbours.previous && (
                <Link
                  href={`/missions/${missionLabel(neighbours.previous)}`}
                  className="hover:bg-muted flex items-center gap-1 rounded-md border px-2 py-1"
                >
                  <ChevronLeftIcon className="size-4" />
                  {missionLabel(neighbours.previous)}
                </Link>
              )}

              {neighbours.next && (
                <Link
                  href={`/missions/${missionLabel(neighbours.next)}`}
                  className="hover:bg-muted flex items-center gap-1 rounded-md border px-2 py-1"
                >
                  {missionLabel(neighbours.next)}
                  <ChevronRightIcon className="size-4" />
                </Link>
              )}
            </nav>
          </div>

          <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <Fact label={t("tools.missions.fields.cost")}>
              <img
                src={buildGameItemIconUrl("Currency_Icon_AP")}
                alt=""
                className="size-5 object-contain"
              />

              <span className="font-nexon-football-gothic text-base">
                {mission.cost}
              </span>
            </Fact>

            <Fact label={t("tools.missions.fields.terrain")}>
              <img
                src={TERRAIN_ICONS[mission.terrain].src}
                alt=""
                className="size-5"
              />
              {t(`common.terrain.${mission.terrain}`)}
            </Fact>

            <Fact label={t("tools.missions.fields.level")}>
              <span className="font-nexon-football-gothic text-base">
                {mission.recommendedLevel}
              </span>
            </Fact>

            <Fact label={t("tools.missions.fields.echelons")}>
              <span className="font-nexon-football-gothic text-base">
                {mission.echelonCount}
              </span>
            </Fact>
          </dl>

          <p className="text-muted-foreground text-sm">
            {t("tools.missions.detail.goals", {
              turns: mission.starTurns,
              sRanks: mission.starSRanks,
            })}

            {mission.challengeTurns !== null &&
              ` ${t("tools.missions.detail.challenge", {
                count: mission.challengeTurns,
              })}`}
          </p>
        </header>

        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="text-lg font-semibold">
            {t("tools.missions.detail.route")}
          </h2>

          <MissionRoute
            label={label}
            map={mission.map}
            solutions={mission.solutions}
            challengeTurns={mission.challengeTurns}
            starSRanks={mission.starSRanks}
          />
        </section>

        <section className="flex min-w-0 flex-col gap-3">
          <h2 className="text-lg font-semibold">
            {t("tools.missions.detail.drops")}
          </h2>

          <MissionDrops
            rewards={mission.rewards}
            items={itemMap}
            locale={locale}
          />
        </section>
      </div>
    </MissionBreadcrumbs>
  );
}

function Fact({
  label,
  children,
}: PropsWithChildren<{
  label: string;
}>) {
  return (
    <div className="flex items-center gap-1.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-1 font-medium">{children}</dd>
    </div>
  );
}
