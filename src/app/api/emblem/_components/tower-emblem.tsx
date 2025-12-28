import { Emblem } from "@/app/api/emblem/_components/emblem";
import {
  buildTowerEmblemBackgroundUrl,
  buildTowerIconUrl,
  type TowerEmblemParams,
} from "@/lib/emblems";

export function TowerEmblem({ boss, defenseType, floor }: TowerEmblemParams) {
  const backgroundUrl = buildTowerEmblemBackgroundUrl(boss.id);
  const iconUrl = buildTowerIconUrl(defenseType);

  const stars = Array.from({ length: Math.floor(floor / 50) }).map(
    (_, index) => (
      <img key={index} src={iconUrl} tw="w-[31px] h-[33px]" alt="" />
    ),
  );

  return (
    <Emblem backgroundUrl={backgroundUrl}>
      <div tw="flex items-end justify-end w-full h-full pb-[16px] pr-[24px]">
        {stars}
      </div>
    </Emblem>
  );
}
