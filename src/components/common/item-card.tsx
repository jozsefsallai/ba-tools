import { buildItemIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import type { ItemRarity } from "@prisma/client";

export type ItemCardProps = {
  name: string;
  iconName: string;
  description?: string | null;
  rarity: ItemRarity;
  displayName?: boolean;
  className?: string;
};

export function ItemCard({
  name,
  iconName,
  description,
  rarity,
  displayName = true,
  className,
}: ItemCardProps) {
  return (
    <article
      className={cn("flex flex-col items-center gap-1 w-20 flex-1", className)}
      title={description ? `${name}\n${description}` : name}
    >
      <div
        className={cn(
          "rounded-md skew-x-[-11deg] ring-2 ring-black dark:ring-white",
          {
            "bg-[#b5cada]": rarity === "N",
            "bg-[#9fe3fa]": rarity === "R",
            "bg-[#ec9d4f]": rarity === "SR",
            "bg-[#a65ef1]": rarity === "SSR",
          },
        )}
      >
        <div className="skew-x-[11deg]">
          <img
            src={buildItemIconUrl(iconName)}
            alt={name}
            className="max-w-full"
          />
        </div>
      </div>

      {displayName && (
        <div className="text-xs font-semibold text-center line-clamp-2">
          {name}
        </div>
      )}
    </article>
  );
}
