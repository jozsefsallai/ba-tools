import { TitleGeneratorView } from "@/app/title-generator/_components/title-generator-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Title Generator - Joe's Blue Archive Tools",
  description: "Generate rendered user titles.",
  twitter: {
    card: "summary",
  },
};

export default async function EmblemPage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">Title Generator</h1>
        </div>
        <p>
          This tool allows you to generate fully rendered user titles for boss
          completions, relationship rank, talent levels, school clubs, as well
          as generic titles with custom text.
        </p>
      </div>

      <TitleGeneratorView />
    </div>
  );
}
