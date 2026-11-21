import { useTranslations } from "next-intl";
import type { GameItemSummary } from "@/lib/data/game-items.server";
import type {
  MissionRewardData,
  MissionRewardTag,
} from "@/lib/game-data/contract";
import { gameItemKey } from "@/lib/game-items";
import { buildGameItemIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import type { ItemRarity } from "~prisma";

const TAG_ORDER: MissionRewardTag[] = [
  "Default",
  "Rare",
  "FirstClear",
  "ThreeStar",
];

const RARITY_TILES: Record<ItemRarity, string> = {
  N: "bg-gradient-to-b from-slate-100 to-slate-300",
  R: "bg-gradient-to-b from-sky-100 to-sky-300",
  SR: "bg-gradient-to-b from-amber-50 to-amber-200",
  SSR: "bg-gradient-to-b from-fuchsia-100 to-purple-300",
};

/** A drop's icon on its rarity tile. */
export function DropIcon({
  iconName,
  rarity,
  alt,
  className,
}: {
  iconName: string;
  rarity: ItemRarity;
  alt: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md p-0.5",
        RARITY_TILES[rarity],
        className,
      )}
    >
      <img
        src={buildGameItemIconUrl(iconName)}
        alt={alt}
        className="size-full object-contain"
        loading="lazy"
      />
    </span>
  );
}

export function dropDisplay(
  reward: Pick<MissionRewardData, "parcelType" | "parcelId">,
  items: Map<string, GameItemSummary>,
  locale: string,
  pyroxene: string,
) {
  if (reward.parcelType === "Currency") {
    return {
      iconName: "Currency_Icon_Gem",
      name: pyroxene,
      rarity: "R" as const,
    };
  }

  const item = items.get(gameItemKey(reward.parcelType, reward.parcelId));
  if (!item) {
    return null;
  }

  return {
    iconName: item.iconName,
    rarity: item.rarity,
    name:
      (locale === "ja"
        ? (item.nameJP ?? item.name)
        : (item.name ?? item.nameJP)) ?? String(reward.parcelId),
  };
}

export const percent = (probability: number) =>
  `${Math.trunc(Number((probability * 10_000).toFixed(6))) / 100}%`;

export function MissionDrops({
  rewards,
  items,
  locale,
}: {
  rewards: MissionRewardData[];
  items: Map<string, GameItemSummary>;
  locale: string;
}) {
  const t = useTranslations();

  return (
    <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
      {TAG_ORDER.map((tag) => {
        const rows = rewards.filter((r) => r.tag === tag);
        if (rows.length === 0) {
          return null;
        }

        const grouped = new Map<string, MissionRewardData[]>();

        for (const r of rows) {
          const key = `${r.parcelType}:${r.parcelId}`;
          grouped.set(key, [
            ...(grouped.get(key) ?? []),
            r,
          ]);
        }

        return (
          <div key={tag} className="flex flex-col gap-1.5">
            <h3 className="text-muted-foreground text-sm font-medium">
              {t(`tools.missions.drops.${tag}`)}
            </h3>

            <ul className="divide-y rounded-lg border">
              {[
                ...grouped.values(),
              ].map((group) => {
                const display = dropDisplay(
                  group[0],
                  items,
                  locale,
                  t("tools.missions.drops.pyroxene"),
                );

                return (
                  <li
                    key={`${group[0].parcelType}:${group[0].parcelId}`}
                    className="flex items-center gap-3 px-3 py-1.5"
                  >
                    {display && (
                      <DropIcon
                        iconName={display.iconName}
                        rarity={display.rarity}
                        alt=""
                        className="size-10"
                      />
                    )}

                    <span className="min-w-0 flex-1 text-sm">
                      {display?.name ?? group[0].parcelId}
                    </span>

                    <span className="font-nexon-football-gothic shrink-0 text-right text-base tabular-nums">
                      {group
                        .map((r) =>
                          r.probability >= 1
                            ? `×${r.amount}`
                            : `×${r.amount} ${percent(r.probability)}`,
                        )
                        .join(" + ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
