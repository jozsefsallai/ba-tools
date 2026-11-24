import { notFound } from "next/navigation";
import { createTranslator } from "next-intl";
import {
  dropDisplay,
  percent,
} from "@/app/[locale]/missions/_components/mission-drops";
import { getMessagesForLocale } from "@/i18n/messages";
import { getGameItems } from "@/lib/data/game-items.server";
import { getMission } from "@/lib/data/missions.server";
import type { MissionRewardData } from "@/lib/game-data/contract";
import { gameItemKey } from "@/lib/game-items";
import { missionLabel, parseMissionLabel } from "@/lib/missions/labels";
import { fetchOgArtwork } from "@/lib/og/artwork.server";
import { OgFrame, ogColors } from "@/lib/og/card";
import {
  MISSION_BOARD_SIZE,
  missionBoardImage,
} from "@/lib/og/mission-board.server";
import { makeOgImage } from "@/lib/og-image.server";
import { ogLocale } from "@/lib/og-metadata.server";
import { buildGameItemIconUrl } from "@/lib/url";
import type { ItemRarity } from "~prisma";

export const runtime = "nodejs";
export const revalidate = 86_400;

const DROP_SIZE = 64;
const MAX_DROPS = 8;

const RARITY_TILES: Record<ItemRarity, string> = {
  N: "linear-gradient(to bottom, #f1f5f9, #cbd5e1)",
  R: "linear-gradient(to bottom, #e0f2fe, #7dd3fc)",
  SR: "linear-gradient(to bottom, #fffbeb, #fde68a)",
  SSR: "linear-gradient(to bottom, #fae8ff, #d8b4fe)",
};

async function ogDrops(
  rewards: MissionRewardData[],
  locale: string,
  pyroxene: string,
) {
  const items = new Map(
    (await getGameItems(rewards)).map((i) => [
      gameItemKey(i.parcelType, i.itemId),
      i,
    ]),
  );

  const chances = new Map<string, MissionRewardData>();

  for (const r of rewards) {
    if (r.tag !== "Default" && r.tag !== "Rare") {
      continue;
    }

    const key = `${r.parcelType}:${r.parcelId}`;
    const seen = chances.get(key);

    if (!seen || r.probability > seen.probability) {
      chances.set(key, r);
    }
  }

  const shown = [
    ...chances.entries(),
  ]
    .sort(([, a], [, b]) => b.probability - a.probability)
    .slice(0, MAX_DROPS);

  return await Promise.all(
    shown.map(async ([key, reward]) => {
      const display = dropDisplay(reward, items, locale, pyroxene);

      return {
        key,
        rarity: display?.rarity ?? "N",
        icon: display
          ? await fetchOgArtwork(buildGameItemIconUrl(display.iconName))
          : undefined,
        chance: percent(reward.probability),
      };
    }),
  );
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      locale: string;
      mission: string;
    }>;
  },
) {
  const { locale: rawLocale, mission: param } = await params;
  const locale = ogLocale(rawLocale);

  const where = parseMissionLabel(decodeURIComponent(param));

  const mission = where ? await getMission(where) : null;
  if (!mission) {
    notFound();
  }

  const t = createTranslator({
    locale,
    messages: await getMessagesForLocale(locale),
  });

  const board = await missionBoardImage({
    map: mission.map,
    solutions: mission.solutions,
  });

  const hard = mission.difficulty === "Hard";

  const drops = await ogDrops(
    mission.rewards,
    locale,
    t("tools.missions.drops.pyroxene"),
  );

  const png = await makeOgImage(
    <OgFrame>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 40,
          height: 458,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 304,
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              marginLeft: 12,
              padding: "6px 22px",
              borderRadius: 6,
              background: hard ? ogColors.purple : "#0284c7",
              transform: "skewX(-12deg)",
            }}
          >
            <span
              style={{
                display: "flex",
                fontFamily: "Nexon Football Gothic",
                fontWeight: 700,
                fontSize: 64,
                lineHeight: 1.1,
                color: "white",
                transform: "skewX(12deg)",
              }}
            >
              {missionLabel(mission)}
            </span>
          </div>

          {drops.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                marginTop: 12,
              }}
            >
              {drops.map((drop) => (
                <div
                  key={drop.key}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    width: DROP_SIZE,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: DROP_SIZE,
                      height: DROP_SIZE,
                      padding: 3,
                      borderRadius: 8,
                      background: RARITY_TILES[drop.rarity],
                    }}
                  >
                    {drop.icon && (
                      <img
                        src={drop.icon}
                        alt=""
                        width={DROP_SIZE - 6}
                        height={DROP_SIZE - 6}
                        style={{
                          objectFit: "contain",
                        }}
                      />
                    )}
                  </div>

                  <span
                    style={{
                      fontFamily: "Nexon Football Gothic",
                      fontWeight: 700,
                      fontSize: 18,
                      color: ogColors.muted,
                    }}
                  >
                    {drop.chance}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            height: MISSION_BOARD_SIZE.height,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={`data:image/png;base64,${board.png.toString("base64")}`}
            alt=""
            width={board.width}
            height={board.height}
          />
        </div>
      </div>
    </OgFrame>,
  );

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
