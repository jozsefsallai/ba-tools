"use client";

import { PVPMatchesList } from "@/app/pvp/_components/pvp-matches-list";
import { MessageBox } from "@/components/common/message-box";
import { Button } from "@/components/ui/button";
import { useQueryWithStatus } from "@/lib/convex";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export type PVPSeasonViewProps = {
  seasonId: Id<"pvpSeason">;
};

export function PVPSeasonView({ seasonId }: PVPSeasonViewProps) {
  const t = useTranslations();
  const query = useQueryWithStatus(api.pvp.getMatchesForSeason, { seasonId });

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
      <div className="md:w-2/3 mx-auto flex flex-col gap-4">
        <div className="flex gap-2 items-center justify-between">
          <h1 className="text-xl font-bold">
            {t("tools.pvp.season.title", { name: query.data.season.name })}
          </h1>

          <Button asChild>
            <Link href={`/pvp/${seasonId}/match/new`}>
              <PlusIcon />
              {t("tools.pvp.season.recordNewMatch")}
            </Link>
          </Button>
        </div>
      </div>

      <PVPMatchesList seasonId={seasonId} matches={query.data.matches} />
    </div>
  );
}
