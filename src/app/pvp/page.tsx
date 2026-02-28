import { PVPView } from "@/app/pvp/_components/pvp-view";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: `${t("tools.pvp.title")} - ${t("common.appName")}`,
    description: t("tools.pvp.description"),
    twitter: {
      card: "summary",
    },
  };
}

export default async function PVPPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">{t("tools.pvp.title")}</h1>
        </div>
        <p>{t("tools.pvp.description")}</p>
      </div>

      <PVPView />
    </div>
  );
}
