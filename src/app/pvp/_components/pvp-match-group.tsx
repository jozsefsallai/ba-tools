import { PVPMatch } from "@/app/pvp/_components/pvp-match";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import type { Doc, Id } from "~convex/dataModel";

export type PVPMatchGroupItem = {
  dayTimestamp: number;
  matches: Array<Doc<"pvpMatchRecord">>;
};

export type PVPMatchGroupProps = {
  seasonId: Id<"pvpSeason">;
  group: PVPMatchGroupItem;
};

export function PVPMatchGroup({ seasonId, group }: PVPMatchGroupProps) {
  const t = useTranslations();

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
        {group.matches.map((match) => (
          <PVPMatch key={match._id} seasonId={seasonId} match={match} />
        ))}
      </div>
    </div>
  );
}
