"use client";

import { PVPMatchesList } from "@/app/pvp/_components/pvp-matches-list";
import { MessageBox } from "@/components/common/message-box";
import { Button } from "@/components/ui/button";
import { useQueryWithStatus } from "@/lib/convex";
import { addDays, startOfDay, subDays } from "date-fns";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export type PVPSeasonViewProps = {
  seasonId: Id<"pvpSeason">;
};

export function PVPSeasonView({ seasonId }: PVPSeasonViewProps) {
  const t = useTranslations();
  const searchParams = useSearchParams();

  const end = searchParams.get("end")
    ? startOfDay(new Date(searchParams.get("end") as string))
    : startOfDay(new Date());

  const query = useQueryWithStatus(api.pvp.getMatchesForSeasonRange, {
    seasonId,
    startDate: subDays(end, 6).getTime(),
    endDate: addDays(end, 1).getTime(),
  });

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
              name: query.data.season?.name ?? "Unknown",
            })}
          </h1>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href={`/pvp/${seasonId}/presets/formations`}>
                Formation Presets
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link href={`/pvp/${seasonId}/presets/enemies`}>
                Enemy Presets
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
      </div>

      <PVPMatchesList seasonId={seasonId} matches={query.data.matches} />
    </div>
  );
}
