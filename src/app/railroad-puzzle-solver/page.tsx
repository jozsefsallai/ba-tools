import { RailroadPuzzleView } from "@/app/railroad-puzzle-solver/_components/railroad-puzzle-view";
import { HelpSheet } from "@/components/sheets/help-sheet";
import { Button } from "@/components/ui/button";
import { HelpCircleIcon } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Railroad Puzzle Solver - Joe's Blue Archive Tools",
  description:
    "Find the path to take when placing railroad tracks in the Highlander event's minigame.",
  twitter: {
    card: "summary",
  },
};

export default async function RailroadPuzzleSolverPage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">Railroad Puzzle Solver</h1>

          <HelpSheet document="railroad-puzzle-solver">
            <Button variant="ghost">
              <HelpCircleIcon />
            </Button>
          </HelpSheet>
        </div>
        <p>
          This tool helps you solve/visualize the path to take when placing your
          railroad tracks in the Highlander event's minigame. You can also
          generate the most optimal combinations of railroad pieces to use if
          you want to minimize your event currency use.
        </p>
      </div>

      <RailroadPuzzleView />
    </div>
  );
}
