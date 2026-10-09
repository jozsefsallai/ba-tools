import { getTeamKey } from "./teamKey";

export type RankingTeam = Array<{ studentId?: string }>;

export function canonicalRankingTeam(team: RankingTeam): RankingTeam {
  return [
    ...team.slice(0, 4),
    ...team.slice(4, 6).sort((a, b) => {
      const left = a.studentId ?? "";
      const right = b.studentId ?? "";
      return left < right ? -1 : left > right ? 1 : 0;
    }),
  ];
}

export function rankingIdentity(team: RankingTeam) {
  const canonical = canonicalRankingTeam(team);
  return { team: canonical, formationKey: getTeamKey(canonical) };
}

export function wilsonInterval(wins: number, total: number) {
  if (total <= 0) {
    return { lower: 0, upper: 0 };
  }

  const z = 1.96;
  const proportion = wins / total;
  const denominator = 1 + (z * z) / total;
  const center = proportion + (z * z) / (2 * total);
  const spread =
    z *
    Math.sqrt((proportion * (1 - proportion) + (z * z) / (4 * total)) / total);

  return {
    lower: Math.max(0, (center - spread) / denominator),
    upper: Math.min(1, (center + spread) / denominator),
  };
}
