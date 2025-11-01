import { Emblem } from "@/app/api/emblem/_components/emblem";
import { DEVNAME_OVERRIDE } from "@/lib/devname";
import {
  buildFavorEmblemBackgroundUrl,
  buildFavorEmblemIconUrl,
  type FavorEmblemParams,
} from "@/lib/emblems";
import { cn } from "@/lib/utils";

export function FavorEmblem({ rank, student }: FavorEmblemParams) {
  const backgroundUrl = buildFavorEmblemBackgroundUrl(rank);
  const iconUrl = buildFavorEmblemIconUrl(
    DEVNAME_OVERRIDE[student.id] ?? student.devName,
  );

  return (
    <Emblem
      backgroundUrl={backgroundUrl}
      overlayUrl={iconUrl}
      overlayClassName="h-[92px] top-[3px]"
    >
      <div tw="flex items-end justify-end w-full pr-[20px]">
        <div
          tw="flex flex-col items-center justify-center w-[380px] font-semibold"
          style={{
            lineHeight: 1,
          }}
        >
          <div
            tw={cn("flex text-[34px] text-center -mt-[28px] uppercase", {
              "text-[#4f6881]": rank === 20,
              "text-[#774b3d]": rank === 50,
              "text-[#844877]": rank === 100,
            })}
            style={{
              textShadow:
                "-2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff",
            }}
          >
            {student.lastName} {student.firstName}
          </div>
        </div>
      </div>
    </Emblem>
  );
}
