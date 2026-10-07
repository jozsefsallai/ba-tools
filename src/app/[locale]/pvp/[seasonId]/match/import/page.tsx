import { PvpScreenshotImport } from "@/app/[locale]/pvp/_components/pvp-screenshot-import";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { Id } from "~convex/dataModel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();

  return {
    title: `${t("tools.pvp.screenshotImport.title")} - ${t("common.appName")}`,
    description: t("tools.pvp.screenshotImport.description"),
  };
}

export default async function ScreenshotImportPage({
  params,
}: {
  params: Promise<{ seasonId: Id<"pvpSeason"> }>;
}) {
  const { seasonId } = await params;
  return <PvpScreenshotImport seasonId={seasonId} />;
}
