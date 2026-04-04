import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MainContent } from "./_components/main-content";
import { Separator } from "@/components/ui/separator";
import { StackContainer } from "@/app/credits/_components/stack-container";

import { LicensesContent } from "@/app/credits/_components/licenses-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t("static.credits.title")} - ${t("common.appName")}`,
  };
}

export default async function CreditsPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <h1 className="text-3xl font-bold">{t("static.credits.title")}</h1>
        <MainContent />

        <Separator />

        <h2 className="text-2xl font-bold">{t("static.credits.techStack")}</h2>
        <StackContainer />

        <Separator />

        <h2 className="text-2xl font-bold">{t("static.credits.licenses")}</h2>
        <LicensesContent />
      </div>
    </div>
  );
}
