"use client";

import { useTranslations } from "next-intl";
import {
  ChargeGauge,
  Readout,
} from "@/app/[locale]/recruitment-tracker/_components/shared";
import { SignedOutToolView } from "@/components/auth/signed-out-tool-view";
import { GAME_SERVER_NAMES } from "@/lib/types";

export function RecruitmentSignedOut() {
  const t = useTranslations();

  return (
    <SignedOutToolView
      title={t("tools.recruitment.title")}
      description={t("tools.recruitment.signedOut.description")}
      features={[
        t("tools.recruitment.signedOut.featureCharge"),
        t("tools.recruitment.signedOut.featureSessions"),
        t("tools.recruitment.signedOut.featureAnalytics"),
      ]}
      example={
        <div className="flex flex-col gap-6">
          <div className="flex items-baseline justify-between gap-3">
            <div className="truncate text-lg font-semibold">
              {t("tools.recruitment.signedOut.exampleName")}
            </div>

            <span className="shrink-0 text-sm text-muted-foreground">
              {GAME_SERVER_NAMES.NA}
            </span>
          </div>

          <ChargeGauge kind="permanent" value={64} />
          <ChargeGauge kind="limited" value={137} />

          <Readout
            items={[
              {
                label: t("tools.recruitment.totalPulls"),
                value: "1,240",
              },
              {
                label: t("tools.recruitment.experiencedThreeStarRate"),
                value: "3.31%",
              },
              {
                label: t("tools.recruitment.softPityRecord"),
                value: "4 / 3",
              },
            ]}
          />
        </div>
      }
    />
  );
}
