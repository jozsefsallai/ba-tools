import { RoadmapView } from "@/components/roadmap/roadmap-view";
import { Separator } from "@/components/ui/separator";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { getCachedRoadmapItems } from "@/lib/roadmap/roadmap.server";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata() {
  return getCardMetadata("global-roadmap", await getLocale());
}

export const revalidate = 3600;

export default async function RoadmapPage() {
  const items = await getCachedRoadmapItems();
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-6 min-w-0">
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold">{t("static.roadmap.title")}</h1>
        <p>{t("static.roadmap.description")}</p>
      </div>

      <Separator />

      <RoadmapView items={items} now={Date.now()} />
    </div>
  );
}
