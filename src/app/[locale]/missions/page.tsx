import { getLocale, getTranslations } from "next-intl/server";
import { MissionList } from "@/app/[locale]/missions/_components/mission-list";
import { getGameItems } from "@/lib/data/game-items.server";
import { listMissions } from "@/lib/data/missions.server";
import { getCardMetadata } from "@/lib/og-metadata.server";

export const revalidate = 86_400;

export async function generateMetadata() {
  return getCardMetadata("missions", await getLocale());
}

export default async function MissionsPage() {
  const t = await getTranslations();
  const missions = await listMissions();
  const items = await getGameItems(missions.flatMap((m) => m.rewards));

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold">{t("tools.missions.title")}</h1>
        <p className="text-muted-foreground max-w-prose text-sm">
          {t("tools.missions.description")}
        </p>
      </div>

      <MissionList missions={missions} items={items} />
    </div>
  );
}
