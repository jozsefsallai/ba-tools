import { PVPFormationPresetsPage } from "@/app/[locale]/pvp/_components/pvp-formation-presets-page";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { auth } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import type { Id } from "~convex/dataModel";

export async function generateMetadata() {
  return getCardMetadata("pvp-seasonId-presets-formations", await getLocale());
}

export default async function FormationPresetsPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  await auth.protect();
  const { seasonId } = await params;
  return <PVPFormationPresetsPage seasonId={seasonId as Id<"pvpSeason">} />;
}
