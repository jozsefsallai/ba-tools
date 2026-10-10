import { TitleGeneratorView } from "@/app/[locale]/title-generator/_components/title-generator-view";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata() {
  return getCardMetadata("title-generator", await getLocale());
}

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
