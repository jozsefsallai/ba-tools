"use client";

import { TriangleAlertIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { fetchRoadmapSuggestions } from "@/app/[locale]/admin/(content)/roadmap/_lib/api";
import { RaidChips } from "@/components/roadmap/roadmap-item-details";
import { BarArtImage, getBarArt } from "@/components/roadmap/roadmap-timeline";
import { useRoadmapLabels } from "@/components/roadmap/use-roadmap-labels";
import { Label } from "@/components/ui/label";
import { useStudents } from "@/hooks/use-students";
import { getItemSwatch } from "@/lib/roadmap/constants";
import type { RoadmapInput } from "@/lib/roadmap/schemas";
import type { RoadmapSuggestion } from "@/lib/roadmap/suggestions";
import type { RoadmapSuggestions } from "@/lib/roadmap/suggestions.server";
import type {
  EditableRoadmapItem,
  EditableRoadmapKind,
} from "@/lib/roadmap/types";
import { cn } from "@/lib/utils";

const SUGGESTED_KINDS: EditableRoadmapKind[] = [
  "raid",
  "frr",
  "event",
  "story",
];

export function hasSuggestions(kind: EditableRoadmapKind) {
  return SUGGESTED_KINDS.includes(kind);
}

export type ItemSuggestionsProps = {
  kind: EditableRoadmapKind;
  date: string;
  selectedId: string | null;
  onSelect: (suggestion: RoadmapSuggestion) => void;
};

type LoadState =
  | {
      status: "loading";
    }
  | {
      status: "failed";
      error: string;
    }
  | {
      status: "loaded";
      result: RoadmapSuggestions;
    };

export function ItemSuggestions({
  kind,
  date,
  selectedId,
  onSelect,
}: ItemSuggestionsProps) {
  const t = useTranslations();
  const labels = useRoadmapLabels();
  const { studentMap } = useStudents();

  const [state, setState] = useState<LoadState>({
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;

    setState({
      status: "loading",
    });

    fetchRoadmapSuggestions(kind, date)
      .then((result) => {
        if (!cancelled) {
          setState({
            status: "loaded",
            result,
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setState({
            status: "failed",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    kind,
    date,
  ]);

  const asItem = (suggestion: RoadmapSuggestion) => {
    const studentId =
      suggestion.kind === "event"
        ? (suggestion.input as RoadmapInput<"event">).eventStudentId
        : null;

    return {
      ...suggestion.input,
      id: suggestion.id,
      kind: suggestion.kind,
      eventStudent: studentId
        ? {
            id: studentId,
            name: studentMap[studentId]?.name ?? "",
          }
        : null,
    } as unknown as EditableRoadmapItem;
  };

  const dateNote = (suggestion: RoadmapSuggestion) => {
    if (suggestion.dateSource === "global") {
      return t("tools.admin.roadmap.suggestions.dates.global");
    }

    if (suggestion.dateSource === "projected" && suggestion.jpStartDate) {
      return t("tools.admin.roadmap.suggestions.dates.projected", {
        date: labels.formatDate(suggestion.jpStartDate),
      });
    }

    return t("tools.admin.roadmap.suggestions.dates.none");
  };

  const warnings = (suggestion: RoadmapSuggestion) => {
    const list: string[] = [];

    if (suggestion.tentative) {
      list.push(t("tools.admin.roadmap.suggestions.tentative"));
    }

    if (suggestion.unknownBoss) {
      list.push(
        t("tools.admin.roadmap.suggestions.unknownBoss", {
          boss: suggestion.unknownBoss,
        }),
      );
    }

    if (suggestion.untranslated) {
      list.push(t("tools.admin.roadmap.suggestions.untranslated"));
    }

    return list;
  };

  const result = state.status === "loaded" ? state.result : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label>{t("tools.admin.roadmap.suggestions.title")}</Label>

        {result?.syncedAt && (
          <span className="text-xs text-muted-foreground">
            {t("tools.admin.roadmap.suggestions.syncedAt", {
              date: labels.formatDate(result.syncedAt),
            })}
          </span>
        )}
      </div>

      {state.status === "loading" && (
        <p className="text-sm text-muted-foreground">
          {t("tools.admin.roadmap.suggestions.loading")}
        </p>
      )}

      {state.status === "failed" && (
        <p className="text-sm text-destructive">
          {t("tools.admin.roadmap.suggestions.failed", {
            error: state.error,
          })}
        </p>
      )}

      {result && result.suggestions.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {result.syncedAt
            ? t("tools.admin.roadmap.suggestions.empty")
            : t("tools.admin.roadmap.suggestions.notSynced")}
        </p>
      )}

      {result && result.suggestions.length > 0 && (
        <ul className="flex flex-col gap-1 max-h-60 overflow-y-auto p-0.5">
          {result.suggestions.map((suggestion) => {
            const item = asItem(suggestion);
            const subtitle = labels.subtitle(item);
            const caption = labels.caption(item);
            const art = getBarArt(item);
            const selected = suggestion.id === selectedId;

            return (
              <li key={suggestion.id}>
                {/* drawn like the bar it becomes on the timeline */}
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(suggestion)}
                  className={cn(
                    "relative flex w-full flex-col gap-px overflow-hidden rounded-md border px-2.5 py-1.5 text-left outline-none hover:brightness-95 focus-visible:ring-2 focus-visible:ring-ring dark:hover:brightness-125",
                    getItemSwatch(item).bar,
                    selected && "ring-2 ring-primary",
                  )}
                >
                  {art && <BarArtImage art={art} />}

                  <span className="relative flex items-baseline justify-between gap-3">
                    <span className="truncate text-[9px] leading-3 font-bold uppercase opacity-70">
                      {subtitle}
                    </span>

                    <span className="flex shrink-0 flex-col items-end">
                      {warnings(suggestion).map((warning) => (
                        <span
                          key={warning}
                          className="flex items-center gap-1 text-[10px] leading-3 font-bold"
                        >
                          <TriangleAlertIcon className="size-3 shrink-0" />
                          {warning}
                        </span>
                      ))}
                    </span>
                  </span>

                  <span className="relative truncate text-sm font-bold">
                    {labels.title(item)}
                  </span>

                  {caption && (
                    <span className="relative truncate text-xs opacity-80">
                      {caption}
                    </span>
                  )}

                  {(item.kind === "raid" || item.kind === "frr") && (
                    <RaidChips
                      item={item}
                      labels={labels}
                      className="relative"
                    />
                  )}

                  <span className="relative flex flex-wrap items-baseline gap-x-2 text-[11px] tabular-nums">
                    {suggestion.dateSource !== "none" && (
                      <span className="font-semibold">
                        {labels.dateRange(item)}
                      </span>
                    )}

                    <span className="opacity-75">{dateNote(suggestion)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
