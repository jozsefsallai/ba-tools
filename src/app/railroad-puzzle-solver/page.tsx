import { RailroadPuzzleView } from "@/app/railroad-puzzle-solver/_components/railroad-puzzle-view";
import { HelpSheet } from "@/components/sheets/help-sheet";
import { Button } from "@/components/ui/button";
import { HelpCircleIcon } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t("tools.railroad.title")} - ${t("common.appName")}`,
    description: t("tools.railroad.description"),
    twitter: {
      card: "summary",
    },
  };
}

export default async function RailroadPuzzleSolverPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
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
