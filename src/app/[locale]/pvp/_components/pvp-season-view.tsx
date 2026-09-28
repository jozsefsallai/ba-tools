"use client";

import { PVPBulkImportDialog } from "@/app/[locale]/pvp/_components/pvp-bulk-import-dialog";
import { PVPMatchesList } from "@/app/[locale]/pvp/_components/pvp-matches-list";
import { PVPSeasonEditDialog } from "@/app/[locale]/pvp/_components/pvp-season-edit-dialog";
import { MessageBox } from "@/components/common/message-box";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUserPreferences } from "@/hooks/use-preferences";
import { Link } from "@/i18n/navigation";
import { isSuperUser } from "@/lib/auth/super-user";
import { useQueryWithStatus } from "@/lib/convex";
import { useUser } from "@clerk/nextjs";
import { format, startOfDay, subDays } from "date-fns";
import { CalendarDaysIcon, PlusIcon } from "lucide-react";
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
  const { user } = useUser();
  const { preferences, savePreferences } = useUserPreferences();
  const searchParams = useSearchParams();

  const end = searchParams.get("end")
    ? startOfDay(new Date(searchParams.get("end") as string))
    : startOfDay(new Date());

  const query = useQueryWithStatus(api.pvp.getSeason, { seasonId });

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

  const season = query.data;
  if (!season) {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        {t("tools.pvp.season.failedToLoad")}
      </MessageBox>
    );
  }

  if (!season.seasonNumber) {
    return (
      <div className="relative isolate overflow-hidden rounded-xl border bg-card/30 px-6 py-12 shadow-sm sm:px-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,oklch(var(--primary)/0.12),transparent_65%)]" />

        <div className="relative mx-auto flex max-w-xl flex-col items-center text-center">
          <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-sm">
            <CalendarDaysIcon className="size-7" aria-hidden="true" />
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            {t("tools.pvp.season.notConfiguredTitle")}
          </h1>

          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            {t("tools.pvp.season.notConfiguredDescription")}
          </p>

          <div className="mt-7">
            <PVPSeasonEditDialog season={season} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold">
                {t("tools.pvp.season.title", { name: season.name })}
              </h1>

              <p className="text-sm text-muted-foreground">
                {t("tools.pvp.seasons.number", {
                  number: season.seasonNumber,
                })}{" "}
                · {t("tools.pvp.seasons.server", { server: season.gameServer })}
              </p>
            </div>

            <PVPSeasonEditDialog season={season} />
          </div>

          <div className="flex items-center gap-2">
            {isSuperUser(user) && <PVPBulkImportDialog seasonId={seasonId} />}

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
        hideEmptyDays={preferences.pvp.hideEmptyAgendaDays}
      />
    </div>
  );
}
