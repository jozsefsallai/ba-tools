import { ScenarioEditorView } from "@/app/scenario-image-generator/_components/scenario-editor-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scenario Image Generator - Joe's Blue Archive Tools",
  description: "Create and generate fake scenario screenshots.",
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
        </div>

        <p>Create and generate fake scenario screenshots.</p>
      </div>

      <ScenarioEditorView />
    </div>
  );
}
