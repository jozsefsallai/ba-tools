import { RaidScoreCalculator } from "@/app/raid-score-calculator/_components/calculator";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Raid Score Calculator - Joe's Blue Archive Tools",
  description: "Convert between clear time and raid score.",
  twitter: {
    card: "summary",
  },
};

export default async function RaidScoreCalculatorPage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">Raid Score Calculator (BETA)</h1>
        </div>
        <p>
          You can use this tool to convert between clear time and raid score for
          a given boss and difficulty.
        </p>
      </div>

      <RaidScoreCalculator />
    </div>
  );
}
