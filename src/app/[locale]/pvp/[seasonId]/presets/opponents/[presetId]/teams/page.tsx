import { PVPEnemyPresetTeamsPage } from "@/app/[locale]/pvp/_components/pvp-enemy-preset-teams-page";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { auth } from "@clerk/nextjs/server";
import { getLocale } from "next-intl/server";
import type { Id } from "~convex/dataModel";

export async function generateMetadata() {
  return getCardMetadata(
    "pvp-seasonId-presets-opponents-presetId-teams",
    await getLocale(),
  );
}

export default async function OpponentPresetTeamsRoute({
  params,
}: {
  params: Promise<{ seasonId: string; presetId: string }>;
}) {
  await auth.protect();
  const resolved = await params;
  return (
    <PVPEnemyPresetTeamsPage
      seasonId={resolved.seasonId as Id<"pvpSeason">}
      presetId={
        resolved.presetId === "anonymous"
          ? undefined
          : (resolved.presetId as Id<"pvpEnemyPreset">)
      }
    />
  );
}
