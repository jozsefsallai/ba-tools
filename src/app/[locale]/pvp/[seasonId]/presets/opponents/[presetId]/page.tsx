import { PVPEnemyPresetEditPage } from "@/app/[locale]/pvp/_components/pvp-enemy-preset-edit-page";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { auth } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import type { Id } from "~convex/dataModel";

export async function generateMetadata() {
  return getCardMetadata(
    "pvp-seasonId-presets-opponents-presetId",
    await getLocale(),
  );
}

export default async function EditOpponentPresetRoute({
  params,
}: {
  params: Promise<{ seasonId: string; presetId: string }>;
}) {
  await auth.protect();
  const resolved = await params;
  return (
    <PVPEnemyPresetEditPage
      seasonId={resolved.seasonId as Id<"pvpSeason">}
      presetId={resolved.presetId as Id<"pvpEnemyPreset">}
    />
  );
}
