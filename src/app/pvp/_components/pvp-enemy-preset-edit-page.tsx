"use client";

import { PVPEnemyPresetForm } from "@/app/pvp/_components/pvp-enemy-preset-form";
import { MessageBox } from "@/components/common/message-box";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export function PVPEnemyPresetEditPage({
  seasonId,
  presetId,
}: {
  seasonId: Id<"pvpSeason">;
  presetId: Id<"pvpEnemyPreset">;
}) {
  const t = useTranslations();

  const presets = useQuery(api.pvp.listEnemyPresets, { seasonId });
  const preset = presets?.find((item) => item._id === presetId);

  if (presets === undefined) {
    return <MessageBox>{t("tools.pvp.presets.loadingEnemy")}</MessageBox>;
  }

  if (!preset) {
    return <MessageBox>{t("tools.pvp.presets.notFound")}</MessageBox>;
  }

  return <PVPEnemyPresetForm seasonId={seasonId} preset={preset} />;
}
