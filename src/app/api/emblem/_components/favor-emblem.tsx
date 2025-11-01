import { Emblem } from "@/app/api/emblem/_components/emblem";
import { DEVNAME_OVERRIDE } from "@/lib/devname";
import {
  buildFavorEmblemBackgroundUrl,
  buildFavorEmblemIconUrl,
  fitFont,
  type FavorEmblemParams,
} from "@/lib/emblems";
import { cn } from "@/lib/utils";

const MAX_TEXT_WIDTH = 400;

export function FavorEmblem({
  rank,
  student,
  nameOverride,
}: FavorEmblemParams) {
  const backgroundUrl = buildFavorEmblemBackgroundUrl(rank);
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
          tw="flex flex-col items-center justify-center w-[380px] h-[68px] font-semibold"
          style={{
            lineHeight: 1,
          }}
        >
          <div
            tw={cn("flex text-center uppercase", {
              "text-[#4f6881]": rank === 20,
              "text-[#774b3d]": rank === 50,
              "text-[#844877]": rank === 100,
            })}
            style={{
              WebkitTextStroke: "6px #fff",
              fontSize: `${fontSize}px`,
            }}
          >
            {name.trim()}
          </div>
        </div>
      </div>
    </Emblem>
  );
}
