import { GachaRateStatsView } from "@/app/[locale]/gacha-rate-stats/_components/gacha-rate-stats-view";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata() {
  return getCardMetadata("gacha-rate-stats", await getLocale());
}

export default async function GachaRateStatsPage() {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
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
