import { ScenarioEditorView } from "@/app/[locale]/scenario-image-generator/_components/scenario-editor-view";
import { HelpSheet } from "@/components/sheets/help-sheet";
import { Button } from "@/components/ui/button";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { HelpCircleIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata() {
  return getCardMetadata("scenario-image-generator", await getLocale());
}

export default async function ScenarioImageGeneratorPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">
            {t("tools.scenarioImageGenerator.title")}
          </h1>

          <HelpSheet document="scenario-image-generator">
            <Button variant="ghost">
              <HelpCircleIcon />
            </Button>
          </HelpSheet>
        </div>

        <p>{t("tools.scenarioImageGenerator.description")}</p>
      </div>

      <ScenarioEditorView />

      <div>
        <p className="text-sm text-muted-foreground text-center">
          {t.rich("tools.scenarioImageGenerator.disclaimer", {
            strong: (children) => <strong>{children}</strong>,
            a: (children) => (
              <a href="https://youtu.be/rASdAmW_P3w" className="underline">
                {children}
              </a>
            ),
          })}
        </p>
      </div>
    </div>
  );
}
