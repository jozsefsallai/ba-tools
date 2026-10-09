"use client";

import { PVPBreadcrumbs } from "@/app/[locale]/pvp/_components/pvp-breadcrumbs";
import { PVPMatch } from "@/app/[locale]/pvp/_components/pvp-match";
import { usePVPSeasonDefaults } from "@/app/[locale]/pvp/_components/pvp-season-provider";
import { MessageBox } from "@/components/common/message-box";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useQuery } from "convex/react";
import { ChevronLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export function PVPEnemyPresetHistoryPage({
  seasonId,
  presetId,
}: {
  seasonId: Id<"pvpSeason">;
  presetId: Id<"pvpEnemyPreset">;
}) {
  const t = useTranslations();
  const history = useQuery(api.pvp.getEnemyPresetHistory, { presetId });
  const season = usePVPSeasonDefaults();

  if (!history) {
    return <MessageBox>{t("tools.pvp.presets.loadingHistory")}</MessageBox>;
  }

  return (
    <PVPBreadcrumbs
      seasonName={season?.season?.name}
      opponentName={history.preset.opponentName || history.preset.name}
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/pvp/${seasonId}/presets/opponents/${presetId}/teams`}>
              <ChevronLeftIcon />
            </Link>
          </Button>

          <h1 className="text-xl font-bold">
            {t("tools.pvp.presets.battleHistoryFor", {
              name: history.preset.name,
            })}
          </h1>
        </div>

        {history.matches.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            {t("tools.pvp.presets.noHistory")}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {history.matches.map((match) => (
              <PVPMatch
                key={match._id}
                seasonId={seasonId}
                seasonNumber={season?.season?.seasonNumber}
                match={match}
              />
            ))}
          </div>
        )}
      </div>
    </PVPBreadcrumbs>
  );
}
