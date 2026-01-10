import { GachaRateStatsView } from "@/app/gacha-rate-stats/_components/gacha-rate-stats-view";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Gacha Rate Stats - Joe's Blue Archive Tools",
  description: "Display basic stats about a Blue Archive pulling session.",
  twitter: {
    card: "summary",
  },
};

export default async function GachaRateStatsPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-10">
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-2 items-center">
          <h1 className="text-xl font-bold">{t("tools.gachaStats.title")}</h1>
        </div>
        <p>
          {t.rich("tools.gachaStats.description", {
            strong: (children) => <strong>{children}</strong>,
          })}
        </p>

        <p className="text-muted-foreground">
          {t.rich("tools.gachaStats.notice", {
            strong: (children) => <strong>{children}</strong>,
          })}
        </p>
      </div>

      <GachaRateStatsView />
    </div>
  );
}
