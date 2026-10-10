import { PvpScreenshotImport } from "@/app/[locale]/pvp/_components/pvp-screenshot-import";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { getLocale } from "next-intl/server";
import type { Id } from "~convex/dataModel";

export async function generateMetadata() {
  return getCardMetadata("pvp-seasonId-match-import", await getLocale());
}

export default async function ScreenshotImportPage({
  params,
}: {
  params: Promise<{ seasonId: Id<"pvpSeason"> }>;
}) {
  const { seasonId } = await params;
  return <PvpScreenshotImport seasonId={seasonId} />;
}
