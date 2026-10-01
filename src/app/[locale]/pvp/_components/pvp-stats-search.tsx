"use client";

import { PVPDefenseTeamStrip } from "@/app/[locale]/pvp/_components/pvp-defense-team-strip";
import { PVPFormation } from "@/app/[locale]/pvp/_components/pvp-formation";
import { PVPStatsStatus } from "@/app/[locale]/pvp/_components/pvp-stats-status";
import { MessageBox } from "@/components/common/message-box";
import { StudentPicker } from "@/components/common/student-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStudents } from "@/hooks/use-students";
import {
  buildPvpCounterSearchHref,
  parsePvpCounterSearchParams,
} from "@/lib/pvp-counter-link";
import { Storage } from "@/lib/storage";
import { type PVPSeasonNumber, PVP_SEASONS } from "@/lib/types";
import { buildStudentIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import { usePaginatedQuery, useQuery } from "convex/react";
import {
  CheckIcon,
  PlusIcon,
  SearchIcon,
  Share2Icon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "~convex/api";
import type { Doc } from "~convex/dataModel";
import type { PVPFormationStudentItem } from "../_lib/types";

const seasonStorage = new Storage<number>("pvp_stats_season");
const excludedStudentsStorage = new Storage<string[]>(
  "pvp_stats_excluded_students",
);

const blankTeam = (): PVPFormationStudentItem[] => [{}, {}, {}, {}, {}, {}];

type SubmittedSearch = {
  seasonNumber: PVPSeasonNumber;
  defenseTeam: Array<{ studentId?: string }>;
  excludedStudentIds: string[];
};

function getSuccessRateClasses(successRate: number) {
  if (successRate >= 0.8) {
    return "border-emerald-400/40 bg-emerald-500/[0.06]";
  }

  if (successRate >= 0.6) {
    return "border-lime-400/40 bg-lime-500/[0.05]";
  }

  if (successRate >= 0.4) {
    return "border-amber-400/40 bg-amber-500/[0.05]";
  }

  if (successRate >= 0.2) {
    return "border-orange-400/40 bg-orange-500/[0.05]";
  }

  return "border-rose-400/40 bg-rose-500/[0.05]";
}

export function PVPStatsSearch() {
  const t = useTranslations();
  const { students, studentMap } = useStudents();

  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();

  const initialSearch = useMemo(() => {
    const params = new URLSearchParams(searchParamsKey);

    return parsePvpCounterSearchParams({
      season: params.get("season") ?? undefined,
      defense: params.get("defense") ?? undefined,
    });
  }, [searchParamsKey]);

  const [seasonNumber, setSeasonNumber] = useState<PVPSeasonNumber>(11);
  const [defenseTeam, setDefenseTeam] = useState(blankTeam);
  const [excludedStudentIds, setExcludedStudentIds] = useState<string[]>([]);
  const [excludedStudentsLoaded, setExcludedStudentsLoaded] = useState(false);
  const [minimumWins, setMinimumWins] = useState(0);
  const [shareFeedback, setShareFeedback] = useState<"idle" | "copied">("idle");
  const [submittedSearch, setSubmittedSearch] =
    useState<SubmittedSearch | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const scrollToResultsRef = useRef(false);
  const appliedInitialSearchRef = useRef<string | null>(null);
  const shareFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (shareFeedbackTimerRef.current) {
        clearTimeout(shareFeedbackTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const saved = seasonStorage.get();

    if (saved && PVP_SEASONS.includes(saved as PVPSeasonNumber)) {
      setSeasonNumber(saved as PVPSeasonNumber);
    }
  }, []);

  useEffect(() => {
    const saved = excludedStudentsStorage.get();

    if (saved) {
      setExcludedStudentIds(saved);
    }
    setExcludedStudentsLoaded(true);
  }, []);

  useEffect(() => {
    if (!initialSearch || !excludedStudentsLoaded || !students.length) {
      return;
    }

    const key = `${initialSearch.seasonNumber}:${initialSearch.defenseTeam
      .map((slot) => slot.studentId ?? "")
      .join(",")}`;

    if (appliedInitialSearchRef.current === key) {
      return;
    }

    const ids = initialSearch.defenseTeam
      .map((slot) => slot.studentId)
      .filter((id): id is string => Boolean(id));

    const valid =
      initialSearch.defenseTeam.length === 6 &&
      initialSearch.defenseTeam.slice(0, 4).some((slot) => slot.studentId) &&
      ids.every((id) => Boolean(studentMap[id])) &&
      ids.length === new Set(ids).size;

    appliedInitialSearchRef.current = key;

    if (!valid) {
      return;
    }

    setSeasonNumber(initialSearch.seasonNumber);

    setDefenseTeam(
      initialSearch.defenseTeam.map((slot) => ({
        student: slot.studentId ? studentMap[slot.studentId] : undefined,
      })),
    );

    scrollToResultsRef.current = true;

    setSubmittedSearch({
      seasonNumber: initialSearch.seasonNumber,
      defenseTeam: initialSearch.defenseTeam,
      excludedStudentIds,
    });
  }, [
    excludedStudentsLoaded,
    excludedStudentIds,
    initialSearch,
    studentMap,
    students.length,
  ]);

  useEffect(() => {
    seasonStorage.set(seasonNumber);
  }, [seasonNumber]);

  useEffect(() => {
    excludedStudentsStorage.set(excludedStudentIds);
  }, [excludedStudentIds]);

  const canSearch = defenseTeam.slice(0, 4).some((item) => item.student);
  const queryArgs = useMemo(() => submittedSearch ?? "skip", [submittedSearch]);

  const summary = useQuery(api.pvpStats.getSummary, { seasonNumber });

  const { results, status, loadMore } = usePaginatedQuery(
    api.pvpStats.search,
    queryArgs,
    { initialNumItems: 20 },
  );

  const filteredResults = useMemo(
    () => results.filter((result) => result.wins >= minimumWins),
    [results, minimumWins],
  );

  useEffect(() => {
    if (
      !scrollToResultsRef.current ||
      !submittedSearch ||
      status === "LoadingFirstPage"
    ) {
      return;
    }

    scrollToResultsRef.current = false;

    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [submittedSearch, status]);

  function updateDefense(
    index: number,
    item: Partial<PVPFormationStudentItem>,
  ) {
    setDefenseTeam((current) => {
      const next = [...current];
      next[index] = { ...next[index], ...item };
      return next;
    });
  }

  function addExcludedStudent(student: { id: string }) {
    setExcludedStudentIds((current) =>
      current.includes(student.id) ? current : [...current, student.id],
    );
  }

  function removeExcludedStudent(studentId: string) {
    setExcludedStudentIds((current) =>
      current.filter((id) => id !== studentId),
    );
  }

  function search() {
    if (!canSearch) {
      return;
    }

    scrollToResultsRef.current = true;

    setSubmittedSearch({
      seasonNumber,
      defenseTeam: getDefenseTeamPayload(),
      excludedStudentIds,
    });
  }

  async function shareSearch() {
    if (!canSearch) {
      return;
    }

    const target = new URL(
      buildPvpCounterSearchHref({
        seasonNumber,
        defenseTeam: getDefenseTeamPayload(),
      }),
      window.location.origin,
    );

    const shareUrl = new URL(window.location.href);
    shareUrl.search = target.search;

    try {
      await navigator.clipboard.writeText(shareUrl.toString());

      setShareFeedback("copied");

      if (shareFeedbackTimerRef.current) {
        clearTimeout(shareFeedbackTimerRef.current);
      }

      shareFeedbackTimerRef.current = setTimeout(() => {
        setShareFeedback("idle");
        shareFeedbackTimerRef.current = null;
      }, 2000);

      toast.success(t("tools.pvp.stats.shareLinkCopied"));
    } catch (error) {
      console.error(error);
      toast.error(t("tools.pvp.stats.shareLinkCopyFailed"));
    }
  }

  function getDefenseTeamPayload() {
    return defenseTeam.map((item) => ({
      studentId: item.student?.id,
    }));
  }

  function moveDefense(from: number, to: number) {
    setDefenseTeam((current) => {
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

  function clearExclusionsAndSearch() {
    if (!canSearch) {
      return;
    }

    scrollToResultsRef.current = true;
    setExcludedStudentIds([]);
    setSubmittedSearch({
      seasonNumber,
      defenseTeam: getDefenseTeamPayload(),
      excludedStudentIds: [],
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{t("tools.pvp.stats.title")}</h1>

          <p className="text-muted-foreground">
            {t("tools.pvp.stats.description")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {t("tools.pvp.stats.season")}
          </span>

          <Select
            value={seasonNumber.toString()}
            onValueChange={(value) =>
              setSeasonNumber(Number(value) as PVPSeasonNumber)
            }
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {PVP_SEASONS.map((season) => (
                <SelectItem key={season} value={season.toString()}>
                  {season}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <PVPStatsStatus />

      <div className="rounded-lg border bg-card/50 p-4">
        {summary ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <div className="text-2xl font-semibold tabular-nums">
                  {summary.clears.toLocaleString()}
                </div>

                <div className="text-sm font-medium">
                  {t("tools.pvp.stats.attackWins")}
                </div>
              </div>

              <div>
                <div className="text-2xl font-semibold tabular-nums">
                  {summary.totalMatches.toLocaleString()}
                </div>

                <div className="text-sm font-medium">
                  {t("tools.pvp.stats.recordedMatches")}
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              {t("tools.pvp.stats.databaseSummaryNote")}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("tools.pvp.stats.defenseTeam")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("tools.pvp.stats.exactDefenseHint")}
          </p>
        </CardHeader>

        <CardContent>
          <PVPDefenseTeamStrip
            formation={defenseTeam}
            students={students}
            onUpdate={updateDefense}
            onMove={moveDefense}
          />

          {!canSearch && (
            <p className="mt-4 text-sm text-muted-foreground">
              {t("tools.pvp.stats.minimumStriker")}
            </p>
          )}

          <div className="mt-6 flex flex-col gap-3">
            <div className="text-sm font-medium">
              {t("tools.pvp.stats.excludeStudents")}
            </div>

            <div className="flex flex-wrap gap-2">
              {excludedStudentIds.map((studentId) => {
                const student = studentMap[studentId];
                if (!student) {
                  return null;
                }

                return (
                  <Badge
                    key={studentId}
                    variant="secondary"
                    className="gap-1.5 py-1 pl-1 pr-1.5"
                  >
                    <img
                      src={buildStudentIconUrl(student)}
                      alt=""
                      className="size-6 rounded-md object-cover"
                    />

                    <span>{student.name}</span>

                    <button
                      type="button"
                      className="rounded-full p-0.5 hover:bg-background/20"
                      aria-label={`${t("tools.pvp.stats.removeExcludedStudent")}: ${student.name}`}
                      onClick={() => removeExcludedStudent(studentId)}
                    >
                      <XIcon className="size-4" />
                    </button>
                  </Badge>
                );
              })}
            </div>

            <StudentPicker
              students={students.filter(
                (student) => !excludedStudentIds.includes(student.id),
              )}
              onStudentSelected={addExcludedStudent}
              placeholder={t("tools.pvp.stats.excludeStudentPlaceholder")}
            >
              <Button type="button" variant="outline" className="w-fit">
                <PlusIcon />
                {t("tools.pvp.stats.addExcludedStudent")}
              </Button>
            </StudentPicker>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <label htmlFor="pvp-minimum-wins" className="text-sm font-medium">
              {t("tools.pvp.stats.minimumWins")}
            </label>

            <Input
              id="pvp-minimum-wins"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              className="w-24"
              value={minimumWins}
              onChange={(event) => {
                const value = Number.parseInt(event.currentTarget.value, 10);
                setMinimumWins(Number.isNaN(value) ? 0 : Math.max(0, value));
              }}
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button disabled={!canSearch} onClick={search}>
              <SearchIcon />
              {t("tools.pvp.stats.search")}
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={!canSearch}
              onClick={() => void shareSearch()}
            >
              {shareFeedback === "copied" ? <CheckIcon /> : <Share2Icon />}
              {shareFeedback === "copied"
                ? t("tools.pvp.stats.shareCopied")
                : t("tools.pvp.stats.share")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div ref={resultsRef} className="scroll-mt-6 flex flex-col gap-4">
        {submittedSearch && status === "LoadingFirstPage" && (
          <MessageBox>{t("common.loading")}</MessageBox>
        )}

        {submittedSearch && status === "Exhausted" && results.length === 0 && (
          <MessageBox>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{t("tools.pvp.stats.noResults")}</span>

              {submittedSearch.excludedStudentIds.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearExclusionsAndSearch}
                >
                  {t("tools.pvp.stats.clearExclusionsAndSearch")}
                </Button>
              )}
            </div>
          </MessageBox>
        )}

        {submittedSearch &&
          status !== "LoadingFirstPage" &&
          results.length > 0 &&
          filteredResults.length === 0 && (
            <MessageBox>
              {t("tools.pvp.stats.noMinimumWinsResults", {
                wins: minimumWins,
              })}
            </MessageBox>
          )}

        {filteredResults.map((result, index) => (
          <Card
            key={`${result.attackTeam.map((item) => item.studentId).join("-")}-${index}`}
            className={cn(
              "gap-0 border-l-2 py-3",
              getSuccessRateClasses(result.successRate),
            )}
          >
            <CardContent className="flex flex-wrap items-center justify-between gap-4 px-4 py-0 sm:px-5">
              <PVPFormation
                name={t("tools.pvp.stats.counterTeam")}
                kind="attack"
                result="win"
                formation={
                  result.attackTeam as Doc<"pvpMatchRecord">["ownTeam"]
                }
                damageChartOpen={false}
                highestDamage={0}
                showHeader={false}
              />

              <div className="text-right">
                <div className="text-2xl font-bold">
                  {(result.successRate * 100).toFixed(1)}%
                </div>

                <div className="text-sm text-muted-foreground">
                  {t("tools.pvp.stats.record", {
                    wins: result.wins,
                    losses: result.losses,
                    total: result.total,
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {submittedSearch && status === "CanLoadMore" && (
          <Button variant="outline" onClick={() => loadMore(20)}>
            {t("common.loadMore")}
          </Button>
        )}
      </div>
    </div>
  );
}
