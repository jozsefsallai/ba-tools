import { RailroadPuzzleView } from "@/app/[locale]/railroad-puzzle-solver/_components/railroad-puzzle-view";
import { HelpSheet } from "@/components/sheets/help-sheet";
import { Button } from "@/components/ui/button";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { HelpCircleIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata() {
  return getCardMetadata("railroad-puzzle-solver", await getLocale());
}

export default async function RailroadPuzzleSolverPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">{t("tools.railroad.title")}</h1>

          <HelpSheet document="railroad-puzzle-solver">
            <Button variant="ghost">
              <HelpCircleIcon />
            </Button>
          </HelpSheet>
        </div>
        <p>{t("tools.railroad.description")}</p>
      </div>

      <RailroadPuzzleView />
    </div>
  );
}
