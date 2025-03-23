import { GachaRateStatsView } from "@/app/gacha-rate-stats/_components/gacha-rate-stats-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gacha Rate Stats - Joe's Blue Archive Tools",
  description: "Display basic stats about a Blue Archive pulling session.",
  twitter: {
    card: "summary",
  },
};

export default async function GachaRateStatsPage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">Gacha Rate Stats</h1>
        </div>
        <p>
          A tool you can use to get basic stats about your Blue Archive gacha
          pulls. Enter how many 3* students you got on each 10-pull and click on
          the <strong>Add attempt</strong> button to add it to the stats. You
          can use the <strong>Remove</strong> button next to each attempt to
          remove it if you've made a mistake.
        </p>

        <p className="text-muted-foreground">
          <strong>Tip:</strong> You can use this tool to display your pull stats
          in real time if you're recording or streaming your pulls by adding a
          Browser Source in OBS, cropping it to the stats square, and keying out
          the background.
        </p>
      </div>

      <GachaRateStatsView />
    </div>
  );
}
