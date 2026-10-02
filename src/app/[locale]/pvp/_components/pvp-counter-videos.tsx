"use client";

import { Button } from "@/components/ui/button";
import type { PVPSeasonNumber } from "@/lib/types";
import { usePaginatedQuery } from "convex/react";
import { PlayIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { api } from "~convex/api";

type Team = Array<{ studentId?: string }>;

export function PVPCounterVideos({
  seasonNumber,
  attackTeam,
  defenseTeam,
}: {
  seasonNumber: PVPSeasonNumber;
  attackTeam: Team;
  defenseTeam: Team;
}) {
  const t = useTranslations();

  const [visibleCount, setVisibleCount] = useState(3);

  const { results, status, loadMore } = usePaginatedQuery(
    api.pvpStats.getMatchVideos,
    { seasonNumber, attackTeam, defenseTeam },
    { initialNumItems: 3 },
  );

  const videos = useMemo(() => [...new Set(results)], [results]);

  useEffect(() => {
    if (videos.length <= visibleCount && status === "CanLoadMore") {
      loadMore(5);
    }
  }, [videos.length, visibleCount, status, loadMore]);

  if (videos.length === 0) {
    return null;
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2 border-t pt-3">
      <span className="mr-1 text-xs text-muted-foreground">
        {t("tools.pvp.stats.matchVideos")}
      </span>

      {videos.slice(0, visibleCount).map((url, index) => (
        <Button key={url} asChild variant="outline" size="xs">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <PlayIcon data-icon="inline-start" />
            {t("tools.pvp.stats.watchVideo", { number: index + 1 })}
          </a>
        </Button>
      ))}

      {videos.length > visibleCount && (
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={() => setVisibleCount((count) => count + 5)}
        >
          {t("tools.pvp.stats.loadMoreVideos")}
        </Button>
      )}
    </div>
  );
}
