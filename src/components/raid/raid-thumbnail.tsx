"use client";

import { SwordsIcon } from "lucide-react";
import { getRaidArt } from "@/lib/roadmap/raid-images";
import { cn } from "@/lib/utils";
import type { RaidType } from "~prisma";

export function RaidThumbnail({
  type,
  boss,
  className,
}: {
  type: RaidType;
  boss?: string | null;
  className?: string;
}) {
  const art = getRaidArt(type, boss);

  return (
    <div
      className={cn(
        "flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted",
        className,
      )}
    >
      {art ? (
        <img
          src={art.image.src}
          alt=""
          draggable={false}
          loading="lazy"
          className={cn(
            "size-full",
            art.shape === "wide" ? "object-contain" : "object-cover",
          )}
        />
      ) : (
        <SwordsIcon className="size-1/2 text-muted-foreground" />
      )}
    </div>
  );
}
