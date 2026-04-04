import { TitleGeneratorView } from "@/app/title-generator/_components/title-generator-view";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Title Generator - Joe's Blue Archive Tools",
  description: "Generate rendered user titles.",
  twitter: {
    card: "summary",
  },
};

export default async function EmblemPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">{t("tools.emblem.title")}</h1>
        </div>

        <p>{t("tools.emblem.description")}</p>
      </div>

      <TitleGeneratorView />
    </div>
  );
}
