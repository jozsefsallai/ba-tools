import { PVPEnemyPresetForm } from "@/app/[locale]/pvp/_components/pvp-enemy-preset-form";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { auth } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import type { Id } from "~convex/dataModel";

export async function generateMetadata() {
  return getCardMetadata(
    "pvp-seasonId-presets-opponents-new",
    await getLocale(),
  );
}

export default async function NewOpponentPresetPage({
  params,
}: {
  params: Promise<{ seasonId: string }>;
}) {
  await auth.protect();
  const { seasonId } = await params;
  return <PVPEnemyPresetForm seasonId={seasonId as Id<"pvpSeason">} />;
}
