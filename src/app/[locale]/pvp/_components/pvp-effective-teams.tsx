"use client";

import { PVPFormation } from "@/app/[locale]/pvp/_components/pvp-formation";
import { PVPStatsStatus } from "@/app/[locale]/pvp/_components/pvp-stats-status";
import { MessageBox } from "@/components/common/message-box";
import { StudentPicker } from "@/components/common/student-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePvpStatsFilters } from "@/hooks/use-pvp-stats-filters";
import { useStudents } from "@/hooks/use-students";
import { type PVPSeasonNumber, PVP_SEASONS } from "@/lib/types";
import { usePaginatedQuery, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { InfoIcon, PlusIcon, ShieldIcon, SwordIcon, XIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import {
  Component,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { api } from "~convex/api";

type RankingSort = "confidence" | "winRateDesc" | "winRateAsc" | "battles";

type Role = "attack" | "defense";

type TeamResult = FunctionReturnType<
  typeof api.pvpStats.listEffectiveTeams
>["page"][number];

class RankingBoundary extends Component<
  {
    children: ReactNode;
    failed: string;
    retry: string;
  },
  { failed: boolean; attempt: number }
> {
  state = { failed: false, attempt: 0 };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <Alert variant="destructive">
          <AlertTitle>{this.props.failed}</AlertTitle>
          <AlertDescription>
            <Button
              variant="outline"
              onClick={() =>
                this.setState((state) => ({
                  failed: false,
                  attempt: state.attempt + 1,
                }))
              }
            >
              {this.props.retry}
            </Button>
          </AlertDescription>
        </Alert>
      );
    return <div key={this.state.attempt}>{this.props.children}</div>;
  }
}

function TeamCard({
  team,
  role,
  number,
}: { team: TeamResult; role: Role; number: number }) {
  const t = useTranslations("tools.pvp.rankings");
  const formatter = useFormatter();
  const titleId = useId();
  const percent = (value: number) =>
    formatter.number(value, { style: "percent", maximumFractionDigits: 1 });
  const range = t("intervalValue", {
    lower: percent(team.confidenceScore),
    upper: percent(team.confidenceUpper),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2">
            {role === "attack" ? (
              <SwordIcon className="size-4" />
            ) : (
              <ShieldIcon className="size-4" />
            )}
            {t("formation", { role: t(role), number })}
          </span>
          <Badge variant="secondary">{t("total", { count: team.total })}</Badge>
        </CardTitle>
        <CardDescription>
          {t("scoreValue", { score: percent(team.confidenceScore) })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <PVPFormation
          formation={team.team}
          name=""
          kind={role}
          result="win"
          showHeader={false}
          damageChartOpen={false}
          highestDamage={0}
        />
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              {t("winRate")}
            </span>
            <span className="text-3xl font-semibold tabular-nums">
              {percent(team.successRate)}
            </span>
          </div>
          <div
            role="img"
            aria-label={t("graphLabel", {
              wins: team.wins,
              losses: team.losses,
              total: team.total,
            })}
            className="flex h-3 overflow-hidden rounded-full bg-muted"
          >
            <div
              className="h-full bg-[var(--chart-1)]"
              style={{ width: `${team.successRate * 100}%` }}
            />
            <div className="h-full flex-1 bg-[var(--chart-3)]" />
          </div>
          <div className="flex justify-between gap-4 text-sm tabular-nums">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[var(--chart-1)]" />
              {t("wins", { count: team.wins })}
            </span>
            <span className="flex items-center gap-2">
              {t("losses", { count: team.losses })}
              <span className="size-2 rounded-full bg-[var(--chart-3)]" />
            </span>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="px-0">
                  {t("interval")} <InfoIcon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-80">
                {t("confidenceHint")}
              </TooltipContent>
            </Tooltip>
            <span className="tabular-nums">{range}</span>
          </div>
          <svg
            viewBox="0 0 320 48"
            className="w-full"
            role="img"
            aria-labelledby={titleId}
          >
            <title id={titleId}>
              {t("interval")}: {range}; {t("winRate")}:{" "}
              {percent(team.successRate)}
            </title>
            <line
              x1="10"
              x2="310"
              y1="14"
              y2="14"
              stroke="var(--border)"
              strokeWidth="4"
            />
            <line
              x1={10 + 300 * team.confidenceScore}
              x2={10 + 300 * team.confidenceUpper}
              y1="14"
              y2="14"
              stroke="var(--chart-2)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <circle
              cx={10 + 300 * team.successRate}
              cy="14"
              r="5"
              fill="var(--foreground)"
              stroke="var(--card)"
              strokeWidth="2"
            />
            {[0, 0.5, 1].map((value) => (
              <text
                key={value}
                x={10 + 300 * value}
                y="42"
                textAnchor={
                  value === 0 ? "start" : value === 1 ? "end" : "middle"
                }
                fontSize="11"
                fill="var(--muted-foreground)"
              >
                {percent(value)}
              </text>
            ))}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamResults({
  snapshot,
  seasonNumber,
  excludedStudentIds,
  role,
  sort,
  minimumBattles,
}: {
  snapshot: string;
  seasonNumber: PVPSeasonNumber;
  excludedStudentIds: string[];
  role: Role;
  sort: RankingSort;
  minimumBattles: number;
}) {
  const t = useTranslations();
  const { results, status, loadMore } = usePaginatedQuery(
    api.pvpStats.listEffectiveTeams,
    { snapshot, seasonNumber, excludedStudentIds, role, sort, minimumBattles },
    { initialNumItems: 20 },
  );
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (
      !node ||
      status !== "CanLoadMore" ||
      typeof IntersectionObserver === "undefined"
    )
      return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMore(20);
      },
      { rootMargin: "300px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [status, loadMore]);

  // Bounded server scans can return empty pages. Keep following the cursor until
  // there are visible results or the indexed range is genuinely exhausted.
  useEffect(() => {
    if (results.length === 0 && status === "CanLoadMore") loadMore(20);
  }, [results.length, status, loadMore]);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {results.map((team, index) => (
          <TeamCard
            key={team.formationKey}
            team={team}
            role={role}
            number={index + 1}
          />
        ))}
      </div>
      <div
        ref={sentinel}
        className="flex flex-col items-center gap-3"
        aria-live="polite"
      >
        {(status === "LoadingFirstPage" || status === "LoadingMore") && (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        )}
        {status === "CanLoadMore" && (
          <Button variant="outline" onClick={() => loadMore(20)}>
            {t("tools.pvp.rankings.loadMore")}
          </Button>
        )}
        {status === "Exhausted" &&
          (results.length === 0 ? (
            <MessageBox>{t("tools.pvp.rankings.empty")}</MessageBox>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("tools.pvp.rankings.exhausted")}
            </p>
          ))}
      </div>
    </div>
  );
}

function RankingsContent() {
  const t = useTranslations();
  const filters = usePvpStatsFilters();
  const { students, studentMap } = useStudents();
  const snapshot = useQuery(api.pvpStats.getRankingsSnapshot);
  const [role, setRole] = useState<Role>("attack");
  const [sort, setSort] = useState<RankingSort>("confidence");
  const [minimumBattles, setMinimumBattles] = useState(1);
  const queryKey = JSON.stringify([
    snapshot,
    filters.seasonNumber,
    role,
    sort,
    minimumBattles,
    filters.excludedStudentIds,
  ]);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h1 className="text-xl font-bold">{t("tools.pvp.rankings.title")}</h1>
          <p className="max-w-3xl text-muted-foreground">
            {t("tools.pvp.rankings.description")}
          </p>
          <PVPStatsStatus />
        </div>
        <Alert>
          <InfoIcon />
          <AlertTitle>{t("tools.pvp.rankings.disclaimerTitle")}</AlertTitle>
          <AlertDescription>
            {t("tools.pvp.rankings.disclaimer")}
          </AlertDescription>
        </Alert>
        <div className="flex flex-col gap-5 rounded-lg border p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rankings-season">
                {t("tools.pvp.stats.season")}
              </Label>
              <Select
                value={String(filters.seasonNumber)}
                disabled={!filters.loaded}
                onValueChange={(value) =>
                  filters.setSeasonNumber(Number(value) as PVPSeasonNumber)
                }
              >
                <SelectTrigger id="rankings-season" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {PVP_SEASONS.map((season) => (
                      <SelectItem key={season} value={String(season)}>
                        {season}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rankings-sort">
                {t("tools.pvp.rankings.sort")}
              </Label>
              <Select
                value={sort}
                onValueChange={(value) => setSort(value as RankingSort)}
              >
                <SelectTrigger id="rankings-sort" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(
                      [
                        "confidence",
                        "winRateDesc",
                        "winRateAsc",
                        "battles",
                      ] as const
                    ).map((value) => (
                      <SelectItem key={value} value={value}>
                        {t(`tools.pvp.rankings.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rankings-minimum">
                {t("tools.pvp.rankings.minimumBattles")}
              </Label>
              <Input
                id="rankings-minimum"
                type="number"
                min={1}
                step={1}
                value={minimumBattles}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (Number.isSafeInteger(value) && value >= 1)
                    setMinimumBattles(value);
                }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">
              {t("tools.pvp.rankings.excludeStudents")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("tools.pvp.rankings.exclusionHint")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {filters.excludedStudentIds.map((id) => (
                <Badge key={id} variant="secondary" className="gap-1">
                  {studentMap[id]?.name ?? id}
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`${t("tools.pvp.stats.removeExcludedStudent")}: ${studentMap[id]?.name ?? id}`}
                    onClick={() =>
                      filters.setExcludedStudentIds((ids) =>
                        ids.filter((item) => item !== id),
                      )
                    }
                  >
                    <XIcon />
                  </Button>
                </Badge>
              ))}
              <StudentPicker
                students={students.filter(
                  (student) => !filters.excludedStudentIds.includes(student.id),
                )}
                onStudentSelected={(student) =>
                  filters.setExcludedStudentIds((ids) => [
                    ...new Set([...ids, student.id]),
                  ])
                }
              >
                <Button variant="outline" size="sm" disabled={!filters.loaded}>
                  <PlusIcon />
                  {t("tools.pvp.stats.addExcludedStudent")}
                </Button>
              </StudentPicker>
            </div>
          </div>
        </div>
        <Tabs value={role} onValueChange={(value) => setRole(value as Role)}>
          <TabsList aria-label={t("tools.pvp.rankings.title")}>
            <TabsTrigger value="attack">
              <SwordIcon className="size-4" />
              {t("tools.pvp.rankings.attack")}
            </TabsTrigger>
            <TabsTrigger value="defense">
              <ShieldIcon className="size-4" />
              {t("tools.pvp.rankings.defense")}
            </TabsTrigger>
          </TabsList>
          {(["attack", "defense"] as const).map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-4">
              {snapshot === undefined || !filters.loaded ? (
                <MessageBox>{t("common.loading")}</MessageBox>
              ) : snapshot === null ? (
                <MessageBox>{t("tools.pvp.rankings.preparing")}</MessageBox>
              ) : (
                <RankingBoundary
                  key={queryKey}
                  failed={t("tools.pvp.rankings.failed")}
                  retry={t("tools.pvp.rankings.retry")}
                >
                  <TeamResults
                    snapshot={snapshot}
                    seasonNumber={filters.seasonNumber}
                    excludedStudentIds={filters.excludedStudentIds}
                    role={tab}
                    sort={sort}
                    minimumBattles={minimumBattles}
                  />
                </RankingBoundary>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </TooltipProvider>
  );
}

export function PVPEffectiveTeams() {
  const t = useTranslations("tools.pvp.rankings");
  return (
    <RankingBoundary failed={t("failed")} retry={t("retry")}>
      <RankingsContent />
    </RankingBoundary>
  );
}
