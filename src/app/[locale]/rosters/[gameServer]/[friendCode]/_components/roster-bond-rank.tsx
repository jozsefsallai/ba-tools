import bondImage from "@/assets/images/bond.png";
import Image from "next/image";

type RosterBondRankProps = {
  rank: number;
  variant: "inline" | "column";
};

export function RosterBondRank({ rank, variant }: RosterBondRankProps) {
  if (variant === "inline") {
    return (
      <div className="absolute top-0 right-0 flex shrink-0 flex-col items-center rounded-md border px-1.5 py-1 md:hidden">
        <Image src={bondImage} alt="🩷" className="size-3.5" />
        <span className="text-xs font-semibold tabular-nums">{rank}</span>
      </div>
    );
  }

  return (
    <div className="hidden shrink-0 flex-col items-center rounded-md border p-2 md:flex">
      <Image src={bondImage} alt="🩷" className="size-4" />
      <span className="text-sm font-semibold tabular-nums">{rank}</span>
    </div>
  );
}
