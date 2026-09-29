"use client";

import { PVPView } from "@/app/[locale]/pvp/_components/pvp-view";
import { Toggle } from "@/components/ui/toggle";
import { Link } from "@/i18n/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { ArchiveIcon, SwordsIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "~convex/api";

export function PVPPageClient() {
  const t = useTranslations();
  const { isLoaded, isSignedIn } = useUser();
  const [showArchived, setShowArchived] = useState(false);

  const seasons = useQuery(
    api.pvp.getOwnSeasons,
    isLoaded && isSignedIn ? {} : "skip",
  );

  const archivedCount =
    seasons?.filter((season) => season.archived).length ?? 0;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-xl font-bold">{t("tools.pvp.title")}</h1>

          {isLoaded && isSignedIn && (
            <Toggle
              aria-label={t("tools.pvp.seasons.archived", {
                count: archivedCount,
              })}
              onPressedChange={setShowArchived}
              pressed={showArchived}
              size="sm"
              variant="outline"
            >
              <ArchiveIcon />
              {t("tools.pvp.seasons.archived", { count: archivedCount })}
            </Toggle>
          )}
        </div>

        <p>{t("tools.pvp.description")}</p>

        <div>
          <Link className="block max-w-2xl" href="/pvp/search">
            <div className="relative flex h-full items-start space-x-4 rounded-md border p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <SwordsIcon className="size-10 shrink-0 text-indigo-300" />
              <div>
                <h3 className="text-lg font-semibold">
                  {t("tools.pvp.stats.openSearch")}
                </h3>

                <p className="text-sm text-muted-foreground">
                  {t("tools.pvp.stats.description")}
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      <PVPView
        onShowArchivedChange={setShowArchived}
        showArchived={showArchived}
      />
    </div>
  );
}
