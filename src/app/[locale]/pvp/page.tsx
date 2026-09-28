import { PVPView } from "@/app/[locale]/pvp/_components/pvp-view";
import { Link } from "@/i18n/navigation";
import { SwordsIcon } from "lucide-react";
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
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">{t("tools.pvp.title")}</h1>
        </div>
        <p>{t("tools.pvp.description")}</p>
        <div>
          <Link className="block max-w-2xl" href="/pvp/search">
            <div className="relative flex h-full items-start space-x-4 rounded-md border p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <SwordsIcon className="size-10 shrink-0 text-indigo-300" />
              <div>
                <h3 className="text-lg font-semibold">
                  {t("tools.pvp.stats.openSearch")}
                </h3>

                <p className="text-sm text-muted-foreground">
                  {t("tools.pvp.stats.description")}
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      <PVPView />
    </div>
  );
}
