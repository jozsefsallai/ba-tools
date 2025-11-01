import { Emblem } from "@/app/api/emblem/_components/emblem";
import { DEVNAME_OVERRIDE } from "@/lib/devname";
import {
  buildFavorEmblemIconUrl,
  buildPotentialEmblemBackgroundUrl,
  fitFont,
  type PotentialEmblemParams,
} from "@/lib/emblems";
import { cn } from "@/lib/utils";

const MAX_TEXT_WIDTH = 400;

export function PotentialEmblem({
  rank,
  student,
  nameOverride,
}: PotentialEmblemParams) {
  const backgroundUrl = buildPotentialEmblemBackgroundUrl(rank);
  const iconUrl = buildFavorEmblemIconUrl(
    DEVNAME_OVERRIDE[student.id] ?? student.devName,
  );

  const name = nameOverride ?? `${student.lastName} ${student.firstName}`;
  const fontSize = fitFont(name, 34, MAX_TEXT_WIDTH, 0.7);

  return (
    <Emblem
      backgroundUrl={backgroundUrl}
      overlayUrl={iconUrl}
      overlayClassName="h-[92px] top-[3px]"
    >
      <div tw="flex items-start justify-end w-full h-full pr-[20px]">
        <div
          tw="flex flex-col items-center justify-center w-[380px] h-[64px] font-semibold"
          style={{
            lineHeight: 1,
          }}
        >
          <div
            tw={cn("flex text-center uppercase", {
              "text-[#426694]": rank === 25,
              "text-[#4e4f8d]": rank === 50,
            })}
            style={{
              textShadow:
                "-2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff",
              fontSize: `${fontSize}px`,
            }}
          >
            {name}
          </div>
        </div>
      </div>
    </Emblem>
  );
}
