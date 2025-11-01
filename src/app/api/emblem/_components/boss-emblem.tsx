import { Emblem } from "@/app/api/emblem/_components/emblem";
import {
  BOSS_EMBLEM_NAMES,
  BOSS_EMBLEM_TERRAINS,
  type BossEmblemParams,
  buildBossEmblemBackgroundUrl,
  buildBossEmblemOverlayUrl,
  buildBossIconUrl,
} from "@/lib/emblems";
import { cn } from "@/lib/utils";

export function BossEmblem({ name, rarity, terrain }: BossEmblemParams) {
  const backgroundUrl = buildBossEmblemBackgroundUrl(rarity);
  const overlayUrl = buildBossEmblemOverlayUrl(name, terrain);
  const iconUrl = buildBossIconUrl(name);

  const bossName = BOSS_EMBLEM_NAMES.find((boss) => boss.id === name);
  const bossTerrain = BOSS_EMBLEM_TERRAINS.find((t) => t.id === terrain);

  return (
    <Emblem
      backgroundUrl={backgroundUrl}
      overlayUrl={overlayUrl}
      icon={
        <div tw="flex pl-[45px]">
          <img src={iconUrl} alt="Boss Icon" tw="h-[91px]" />
        </div>
      }
    >
      <div tw="flex items-end justify-end w-full pr-[25px]">
        <div
          tw="flex flex-col items-end justify-end text-right w-[160px] font-semibold"
          style={{
            lineHeight: 1,
          }}
        >
          <div
            tw={cn("flex text-[#61201c] text-[23px] pb-[2px]", {
              "text-[#2e4c66]": rarity === "N",
              "text-[#26466f]": rarity === "R",
              "text-[#572421]": rarity === "SR",
              "text-[#482488]": rarity === "SSR",
            })}
            style={{
              letterSpacing: -0.8,
              WebkitTextStroke: "6px #fff",
            }}
          >
            {bossName?.name ?? name}
          </div>

          <div
            tw="flex uppercase text-[#9836d9] text-[16px]"
            style={{
              WebkitTextStroke: "6px #fff",
            }}
          >
            {bossTerrain?.name ?? terrain} Warfare
          </div>

          <div
            tw="flex uppercase text-[#9836d9] text-[16px]"
            style={{
              WebkitTextStroke: "6px #fff",
            }}
          >
            Defeated!
          </div>
        </div>
      </div>
    </Emblem>
  );
}
