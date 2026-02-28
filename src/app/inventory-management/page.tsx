import { InventoryManagementSimulatorView } from "@/app/inventory-management/_components/simulator-view";
import { HelpSheet } from "@/components/sheets/help-sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { HelpCircleIcon } from "lucide-react";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t("tools.inventoryManagement.title")} - ${t("common.appName")}`,
    description: t("tools.inventoryManagement.description"),
    twitter: {
      card: "summary",
    },
  };
}

export default async function InventoryManagementPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">
            {t("tools.inventoryManagement.title")}
          </h1>
          <HelpSheet document="inventory-management">
            <Button variant="ghost">
              <HelpCircleIcon />
            </Button>
          </HelpSheet>
        </div>
        <p>{t("tools.inventoryManagement.description")}</p>

        <p className="text-muted-foreground">
          {t.rich("tools.inventoryManagement.notice", {
            strong: (children) => <strong>{children}</strong>,
          })}
        </p>
      </div>

      <Suspense>
        <InventoryManagementSimulatorView />
      </Suspense>

      <Separator />

      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <h2 className="text-lg font-bold">How To Use</h2>

        <div className="prose dark:prose-invert max-w-full">
          <ol>
            <li>Select the event and round from the preset.</li>

            <li>
              Click <strong>Simulate</strong> to get the item placement
              probabilities.
            </li>

            <li>
              Go into the game and uncover the tile with the highest
              probability. You can uncover more, but I recommend you only do one
              to minimize the risk of using currency on false positives.
            </li>

            <li>
              If you see part of an item, carefully uncover the tiles around it
              too.
            </li>

            <li>
              In the simulator, place the item you uncovered in the previous
              step using the buttons below the board. If you haven't uncovered
              anything, just click on the tile you uncovered. Your board on the
              tool should always match the in-game board.
            </li>

            <li>
              Rinse and repeat until you uncover all the items from this round.
            </li>

            <li>
              When you're done with the round, select the new round from the
              presets and repeat the process.
            </li>
          </ol>
        </div>

        <h2 className="text-lg font-bold">
          Too many words/don't get it, just show me what to do
        </h2>

        <div className="aspect-[16/10]">
          <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/sapLPzKUJp8"
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
