import { PVPPresetsView } from "@/app/[locale]/pvp/_components/pvp-presets-view";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { auth } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import type { Id } from "~convex/dataModel";

export async function generateMetadata() {
  return getCardMetadata("pvp-seasonId-presets", await getLocale());
}

export default async function PVPPresetsPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  await auth.protect();
  const { seasonId } = await params;
  return <PVPPresetsView seasonId={seasonId as Id<"pvpSeason">} />;
}
