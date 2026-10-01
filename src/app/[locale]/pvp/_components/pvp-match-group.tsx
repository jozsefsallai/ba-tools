import { PVPMatch } from "@/app/[locale]/pvp/_components/pvp-match";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { LoaderCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { Doc, Id } from "~convex/dataModel";

const INITIAL_VISIBLE_MATCHES = 3;
const PAGE_SIZE = 30;

export type PVPMatchGroupItem = {
  dayTimestamp: number;
  matches: Array<Doc<"pvpMatchRecord">>;
};

export type PVPMatchGroupProps = {
  seasonId: Id<"pvpSeason">;
  group: PVPMatchGroupItem;
  paginationStatus:
    | "LoadingFirstPage"
    | "CanLoadMore"
    | "LoadingMore"
    | "Exhausted";
  loadMore: (numItems: number) => void;
  seasonNumber?: number;
};

export function PVPMatchGroup({
  seasonId,
  group,
  paginationStatus,
  loadMore,
  seasonNumber,
}: PVPMatchGroupProps) {
  const t = useTranslations();
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_MATCHES);
  const [pendingLoadStart, setPendingLoadStart] = useState<number | null>(null);

  useEffect(() => {
    if (
      pendingLoadStart === null ||
      paginationStatus === "LoadingMore" ||
      group.matches.length <= pendingLoadStart
    ) {
      return;
    }

    setVisibleCount((current) =>
      Math.min(current + PAGE_SIZE, group.matches.length),
    );

    setPendingLoadStart(null);
  }, [group.matches.length, paginationStatus, pendingLoadStart]);

  const formattedDate = useMemo(() => {
    return format(new Date(group.dayTimestamp), "MMMM d, yyyy");
  }, [group.dayTimestamp]);

  const attackWins = useMemo(() => {
    return group.matches.filter(
      (match) => match.matchType === "attack" && match.result === "win",
    ).length;
  }, [group.matches]);

  const attackLoses = useMemo(() => {
    return group.matches.filter(
      (match) => match.matchType === "attack" && match.result === "loss",
    ).length;
  }, [group.matches]);

  const defenseWins = useMemo(() => {
    return group.matches.filter(
      (match) => match.matchType === "defense" && match.result === "win",
    ).length;
  }, [group.matches]);

  const defenseLoses = useMemo(() => {
    return group.matches.filter(
      (match) => match.matchType === "defense" && match.result === "loss",
    ).length;
  }, [group.matches]);

  const hiddenLoadedMatches = group.matches.length - visibleCount;
  const showLoadMoreButton =
    paginationStatus !== "Exhausted" || hiddenLoadedMatches > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 justify-between">
        <h2 className="text-lg font-semibold">{formattedDate}</h2>

        <div className="text-sm text-muted-foreground">
          <strong>{t("tools.pvp.matchGroup.attacks")}</strong> {attackWins}{" "}
          {t("tools.pvp.matchGroup.won")}, {attackLoses}{" "}
          {t("tools.pvp.matchGroup.lost")} ({attackWins + attackLoses}{" "}
          {t("tools.pvp.matchGroup.total")}) &middot;{" "}
          <strong>{t("tools.pvp.matchGroup.defenses")}</strong> {defenseWins}{" "}
          {t("tools.pvp.matchGroup.won")}, {defenseLoses}{" "}
          {t("tools.pvp.matchGroup.lost")} ({defenseWins + defenseLoses}{" "}
          {t("tools.pvp.matchGroup.total")})
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {group.matches.length === 0 && (
          <p className="rounded border border-dashed p-4 text-sm text-muted-foreground">
            No recorded PVP matches on this day.
          </p>
        )}

        {group.matches.slice(0, visibleCount).map((match) => (
          <PVPMatch
            key={match._id}
            seasonId={seasonId}
            seasonNumber={seasonNumber}
            match={match}
          />
        ))}

        {showLoadMoreButton && (
          <Button
            variant="outline"
            onClick={() => {
              if (paginationStatus === "Exhausted") {
                setVisibleCount(group.matches.length);
              } else {
                setPendingLoadStart(group.matches.length);
                loadMore(PAGE_SIZE);
              }
            }}
            disabled={paginationStatus === "LoadingMore"}
          >
            {paginationStatus === "LoadingMore" && (
              <LoaderCircleIcon className="animate-spin" />
            )}

            {paginationStatus === "LoadingMore"
              ? t("common.loadingMore")
              : paginationStatus === "Exhausted"
                ? t("tools.pvp.matchGroup.loadMore", {
                    count: hiddenLoadedMatches,
                  })
                : t("tools.pvp.matchGroup.loadMoreGeneric")}
          </Button>
        )}

        {visibleCount > INITIAL_VISIBLE_MATCHES &&
          paginationStatus === "Exhausted" && (
            <Button
              variant="ghost"
              onClick={() => setVisibleCount(INITIAL_VISIBLE_MATCHES)}
            >
              {t("tools.pvp.matchGroup.showFewer")}
            </Button>
          )}
      </div>
    </div>
  );
}
