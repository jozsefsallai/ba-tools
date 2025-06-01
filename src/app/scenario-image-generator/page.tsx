import { ScenarioEditorView } from "@/app/scenario-image-generator/_components/scenario-editor-view";
import { HelpSheet } from "@/components/sheets/help-sheet";
import { Button } from "@/components/ui/button";
import { HelpCircleIcon } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scenario Image Generator - Joe's Blue Archive Tools",
  description:
    "Create and generate fake scenario/story screenshots. A very close replica of the in-game VN engine.",
  twitter: {
    card: "summary",
  },
};

export default async function ScenarioImageGeneratorPage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">Scenario Image Generator</h1>

          <HelpSheet document="scenario-image-generator">
            <Button variant="ghost">
              <HelpCircleIcon />
            </Button>
          </HelpSheet>
        </div>

        <p>
          Create and generate images that resemble fake Blue Archive
          scenario/story screenshots.
        </p>

        <p>
          Currently, the following scenario elements are supported: dialogue,
          name, affiliation, background, character sprites. You can configure
          these settings, as well as the general appearance of the UI under the
          preview.
        </p>
      </div>

      <ScenarioEditorView />

      <div className="md:w-2/3 mx-auto">
        <p className="text-sm text-muted-foreground text-center">
          <strong>Disclaimer:</strong> Some of the assets used in this tool were
          extracted from{" "}
          <a href="https://youtu.be/rASdAmW_P3w" className="underline">
            HansTNO's template
          </a>
          .
        </p>
      </div>
    </div>
  );
}
