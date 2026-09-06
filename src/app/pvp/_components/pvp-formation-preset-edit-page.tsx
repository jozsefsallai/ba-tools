"use client";

import { PVPFormationPresetForm } from "@/app/pvp/_components/pvp-formation-preset-form";
import { MessageBox } from "@/components/common/message-box";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export function PVPFormationPresetEditPage({
  seasonId,
  presetId,
}: {
  seasonId: Id<"pvpSeason">;
  presetId: Id<"pvpFormationPreset">;
}) {
  const t = useTranslations();

  const presets = useQuery(api.pvp.listFormationPresets, { seasonId });
  const preset = presets?.find((item) => item._id === presetId);

  if (presets === undefined) {
    return <MessageBox>{t("tools.pvp.presets.loadingFormation")}</MessageBox>;
  }

  if (!preset) {
    return <MessageBox>{t("tools.pvp.presets.notFound")}</MessageBox>;
  }

  return <PVPFormationPresetForm seasonId={seasonId} preset={preset} />;
}
