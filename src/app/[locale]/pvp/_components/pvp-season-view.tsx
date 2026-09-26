"use client";

import { PVPMatchesList } from "@/app/[locale]/pvp/_components/pvp-matches-list";
import { MessageBox } from "@/components/common/message-box";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUserPreferences } from "@/hooks/use-preferences";
import { Link } from "@/i18n/navigation";
import { useQueryWithStatus } from "@/lib/convex";
import { addDays, format, startOfDay, subDays } from "date-fns";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export type PVPSeasonViewProps = {
  seasonId: Id<"pvpSeason">;
};

export function PVPSeasonView({ seasonId }: PVPSeasonViewProps) {
  const t = useTranslations();
  const { preferences, savePreferences } = useUserPreferences();
  const searchParams = useSearchParams();

  const end = searchParams.get("end")
    ? startOfDay(new Date(searchParams.get("end") as string))
    : startOfDay(new Date());

  const query = useQueryWithStatus(api.pvp.getMatchesForSeasonRange, {
    seasonId,
    startDate: subDays(end, 6).getTime(),
    endDate: addDays(end, 1).getTime(),
  });

  async function setHideEmptyDays(checked: boolean) {
    try {
      await savePreferences({
        ...preferences,
        pvp: { ...preferences.pvp, hideEmptyAgendaDays: checked },
      });
    } catch (error) {
      console.error(error);
      toast.error(t("common.userPreferences.toasts.saveFailed"));
    }
  }

  if (query.status === "pending") {
    return <MessageBox>{t("common.loading")}</MessageBox>;
  }

  if (query.status === "error") {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        {t("tools.pvp.season.failedToLoad")}
      </MessageBox>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 items-center justify-between">
          <h1 className="text-xl font-bold">
            {t("tools.pvp.season.title", {
              name: query.data.season?.name ?? t("tools.pvp.season.unknown"),
            })}
          </h1>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/pvp/${seasonId}/presets/formations`}>
                {t("tools.pvp.season.formationPresets")}
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link href={`/pvp/${seasonId}/presets/opponents`}>
                {t("tools.pvp.season.enemyPresets")}
              </Link>
            </Button>

            <Button asChild>
              <Link href={`/pvp/${seasonId}/match/new`}>
                <PlusIcon />
                {t("tools.pvp.season.recordNewMatch")}
              </Link>
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
          <span className="text-sm text-muted-foreground">
            {t("tools.pvp.season.displayingDateRange", {
              start: format(subDays(end, 6), "MMM d, yyyy"),
              end: format(end, "MMM d, yyyy"),
            })}
          </span>

          <div className="flex items-center gap-2">
            <Label htmlFor="pvp-hide-empty-days">
              {t("tools.pvp.season.hideEmptyDays")}
            </Label>

            <Switch
              id="pvp-hide-empty-days"
              checked={preferences.pvp.hideEmptyAgendaDays}
              onCheckedChange={(checked) => void setHideEmptyDays(checked)}
            />
          </div>
        </div>
      </div>

      <PVPMatchesList
        seasonId={seasonId}
        matches={query.data.matches}
        hideEmptyDays={preferences.pvp.hideEmptyAgendaDays}
      />
    </div>
  );
}
