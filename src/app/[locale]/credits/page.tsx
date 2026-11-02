import { getLocale, getTranslations } from "next-intl/server";
import { LicensesContent } from "@/app/[locale]/credits/_components/licenses-content";

import { StackContainer } from "@/app/[locale]/credits/_components/stack-container";
import { Separator } from "@/components/ui/separator";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { MainContent } from "./_components/main-content";

export async function generateMetadata() {
  return getCardMetadata("credits", await getLocale());
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
