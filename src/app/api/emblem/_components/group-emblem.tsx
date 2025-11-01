import { Emblem } from "@/app/api/emblem/_components/emblem";
import {
  buildGroupEmblemBackgroundUrl,
  buildGroupEmblemIconUrl,
  GROUP_EMBLEM_CLUBS,
  type GroupEmblemParams,
} from "@/lib/emblems";
import { cn } from "@/lib/utils";

export function GroupEmblem({ school, club, nameOverride }: GroupEmblemParams) {
  const backgroundUrl = buildGroupEmblemBackgroundUrl();
  const iconUrl = buildGroupEmblemIconUrl(school);

  const clubName = club && GROUP_EMBLEM_CLUBS.find((c) => c.id === club);

  const name =
    nameOverride ?? `${clubName?.name ?? club ?? "Unknown Club"} Advisor`;

  return (
    <Emblem
      backgroundUrl={backgroundUrl}
      overlayUrl={iconUrl}
      overlayClassName="h-[92px] top-[3px]"
    >
      <div tw="flex items-center justify-end w-full h-full pr-[20px]">
        <div
          tw="flex flex-col items-center justify-center w-[380px] font-semibold"
          style={{
            lineHeight: 1,
          }}
        >
          <div
            tw={cn("flex text-center text-[35px] text-[#274a7a]", {
              "text-[30px]": name.length > 20,
            })}
            style={{
              textShadow:
                "-2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff, 4px 4px 1px rgba(39, 74, 122, 0.2)",
            }}
          >
            {name}
          </div>
        </div>
      </div>
    </Emblem>
  );
}
