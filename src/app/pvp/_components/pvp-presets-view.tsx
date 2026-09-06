"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { Id } from "~convex/dataModel";

export function PVPPresetsView({ seasonId }: { seasonId: Id<"pvpSeason"> }) {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/pvp/${seasonId}`}>
            <ChevronLeftIcon />
          </Link>
        </Button>
        <h1 className="text-xl font-bold">{t("tools.pvp.presets.title")}</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Button
          className="h-auto justify-start p-6 text-left"
          variant="outline"
          asChild
        >
          <Link href={`/pvp/${seasonId}/presets/formations`}>
            <span>
              <strong className="block text-base">
                {t("tools.pvp.presets.formationTitle")}
              </strong>

              <span className="text-sm font-normal text-muted-foreground">
                {t("tools.pvp.presets.formationDescription")}
              </span>
            </span>
          </Link>
        </Button>

        <Button
          className="h-auto justify-start p-6 text-left"
          variant="outline"
          asChild
        >
          <Link href={`/pvp/${seasonId}/presets/enemies`}>
            <span>
              <strong className="block text-base">
                {t("tools.pvp.presets.enemyTitle")}
              </strong>

              <span className="text-sm font-normal text-muted-foreground">
                {t("tools.pvp.presets.enemyDescription")}
              </span>
            </span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
