import { EMBLEM_HEIGHT, EMBLEM_WIDTH } from "@/lib/emblems";
import { cn } from "@/lib/utils";
import type { PropsWithChildren, ReactNode } from "react";

export type EmblemProps = PropsWithChildren<{
  backgroundUrl: string;
  overlayUrl?: string;
  overlayClassName?: string;
  icon?: ReactNode;
}>;

export function Emblem({
  backgroundUrl,
  overlayUrl,
  overlayClassName,
  icon,
  children,
}: EmblemProps) {
  return (
    <div
      tw="flex relative"
      style={{ width: EMBLEM_WIDTH, height: EMBLEM_HEIGHT }}
    >
      <img src={backgroundUrl} alt="Emblem Background" tw="w-full h-full" />

      {overlayUrl && (
        <img
          src={overlayUrl}
          alt="Emblem Overlay"
          tw={cn(
            "flex absolute top-[4px] left-[4px] h-[91px]",
            overlayClassName,
          )}
        />
      )}

      {icon && <div tw="flex absolute top-[4px] left-[4px]">{icon}</div>}

      {children && (
        <div tw="flex absolute top-0 left-0 w-full h-[94px] flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
