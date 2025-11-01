import { Emblem } from "@/app/api/emblem/_components/emblem";
import {
  type BasicEmblemParams,
  buildBasicEmblemBackgroundUrl,
} from "@/lib/emblems";
import { cn } from "@/lib/utils";

export function BasicEmblem({ text }: BasicEmblemParams) {
  return (
    <Emblem backgroundUrl={buildBasicEmblemBackgroundUrl()}>
      <div
        tw={cn("pl-[100px] flex text-[#4d7694] text-[35px] text-center", {
          "text-[30px]": text.length > 20,
        })}
        style={{
          textShadow:
            "-2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff",
        }}
      >
        {text}
      </div>
    </Emblem>
  );
}
