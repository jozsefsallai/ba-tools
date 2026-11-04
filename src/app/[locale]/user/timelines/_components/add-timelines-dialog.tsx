"use client";

import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useMemo, useState } from "react";
import { MessageBox } from "@/components/common/message-box";
import { RaidChips } from "@/components/raid/raid-chips";
import { RaidFilterBar } from "@/components/raid/raid-filter-bar";
import { RaidThumbnail } from "@/components/raid/raid-thumbnail";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  matchesRaidFilters,
  type RaidFilters,
  type RaidInfo,
} from "@/lib/raid-info";
import { buildStudentIconUrlFromId } from "@/lib/url";
import { cn } from "@/lib/utils";
import type { Doc, Id } from "~convex/dataModel";

const BATCH_SIZE = 30;
const PREVIEW_STUDENTS = 6;

function getPreviewStudentIds(timeline: Doc<"timeline">) {
  const ids = new Set<string>();

  for (const row of timeline.formation?.rows ?? []) {
    for (const slot of [
      ...row.strikers,
      ...row.specials,
      ...(row.tcs ?? []),
    ]) {
      if (slot.studentId) {
        ids.add(slot.studentId);
      }
    }
  }

  if (ids.size === 0) {
    for (const item of timeline.items) {
      if (item.type === "student") {
        ids.add(item.studentId);
      }
    }
  }

  return Array.from(ids);
}

function matchesGroupRaid(timeline: Doc<"timeline">, raid: RaidInfo) {
  return matchesRaidFilters(timeline.raid, {
    types: [
      raid.type,
    ],
    bosses: raid.boss
      ? [
          raid.boss,
        ]
      : undefined,
    defenseTypes: raid.defenseTypes,
    terrains: raid.terrains,
    difficulties: raid.difficulty
      ? [
          raid.difficulty,
        ]
      : undefined,
  });
}

function TimelineRow({
  timeline,
  checked,
  disabled,
  onToggle,
}: {
  timeline: Doc<"timeline">;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations();

  const studentIds = useMemo(
    () => getPreviewStudentIds(timeline),
    [
      timeline,
    ],
  );

  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the checkbox is the control
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-md border p-2 transition-colors hover:bg-accent",
        checked &&
          !disabled &&
          "border-primary bg-primary/10 hover:bg-primary/15",
        disabled && "cursor-default opacity-60 hover:bg-transparent",
      )}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={onToggle}
      />

      {timeline.raid && (
        <RaidThumbnail
          type={timeline.raid.type}
          boss={timeline.raid.boss}
          className="h-10 w-16 max-md:hidden"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn("truncate text-sm font-semibold", {
              "font-normal text-muted-foreground italic": !timeline.name,
            })}
          >
            {timeline.name ?? t("tools.myTimelines.editGroup.untitledTimeline")}
          </span>

          {disabled && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {t("tools.myTimelines.addDialog.alreadyAdded")}
            </span>
          )}
        </div>

        {timeline.raid && <RaidChips raid={timeline.raid} />}

        {studentIds.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1.5">
              {studentIds.slice(0, PREVIEW_STUDENTS).map((id) => (
                <img
                  key={id}
                  src={buildStudentIconUrlFromId(id)}
                  alt=""
                  draggable={false}
                  loading="lazy"
                  className="size-6 rounded-full border border-background bg-background object-cover"
                />
              ))}
            </div>

            {studentIds.length > PREVIEW_STUDENTS && (
              <span className="text-xs text-muted-foreground">
                {`+${studentIds.length - PREVIEW_STUDENTS}`}
              </span>
            )}
          </div>
        )}
      </div>
    </label>
  );
}

export type AddTimelinesDialogProps = {
  timelines: Doc<"timeline">[];
  existingIds: Id<"timeline">[];
  groupRaid: RaidInfo | undefined;
  onAdd: (timelines: Doc<"timeline">[]) => void;
  children: ReactNode;
};

export function AddTimelinesDialog({
  timelines,
  existingIds,
  groupRaid,
  onAdd,
  children,
}: AddTimelinesDialogProps) {
  const t = useTranslations();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<RaidFilters>({});
  const [selected, setSelected] = useState<Id<"timeline">[]>([]);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

  const existing = useMemo(
    () => new Set(existingIds),
    [
      existingIds,
    ],
  );

  const { rows, matchCount } = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = timelines.filter(
      (timeline) =>
        (timeline.name ?? "").toLowerCase().includes(term) &&
        matchesRaidFilters(timeline.raid, filters),
    );

    const matching = groupRaid
      ? filtered.filter((timeline) => matchesGroupRaid(timeline, groupRaid))
      : [];
    const matchingIds = new Set(matching.map((timeline) => timeline._id));

    return {
      rows: [
        ...matching,
        ...filtered.filter((timeline) => !matchingIds.has(timeline._id)),
      ],
      matchCount: matching.length,
    };
  }, [
    timelines,
    search,
    filters,
    groupRaid,
  ]);

  function handleOpenChange(next: boolean) {
    setOpen(next);

    if (!next) {
      setSearch("");
      setFilters({});
      setSelected([]);
      setVisibleCount(BATCH_SIZE);
    }
  }

  function toggle(id: Id<"timeline">) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [
            ...current,
            id,
          ],
    );
  }

  function handleAdd() {
    const chosen = new Set(selected);

    onAdd(timelines.filter((timeline) => chosen.has(timeline._id)));
    handleOpenChange(false);
  }

  function renderRow(timeline: Doc<"timeline">) {
    const isExisting = existing.has(timeline._id);

    return (
      <TimelineRow
        key={timeline._id}
        timeline={timeline}
        checked={isExisting || selected.includes(timeline._id)}
        disabled={isExisting}
        onToggle={() => toggle(timeline._id)}
      />
    );
  }

  const visibleRows = rows.slice(0, visibleCount);
  const visibleMatches = visibleRows.slice(0, matchCount);
  const visibleOthers = visibleRows.slice(matchCount);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="flex max-h-[85dvh] flex-col gap-4 sm:max-w-2xl max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-full max-sm:rounded-none max-sm:border-0">
        <DialogHeader>
          <DialogTitle>{t("tools.myTimelines.addDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("tools.myTimelines.addDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <RaidFilterBar
          inDialog
          scope="timeline"
          search={search}
          onSearchChange={setSearch}
          filters={filters}
          onFiltersChange={setFilters}
        />

        <div className="-mx-1 flex min-h-40 flex-1 flex-col gap-2 overflow-y-auto px-1">
          {rows.length === 0 && (
            <MessageBox>
              <p>{t("tools.myTimelines.editGroup.noTimelinesFound")}</p>
            </MessageBox>
          )}

          {visibleMatches.length > 0 && (
            <h3 className="text-xs font-semibold text-muted-foreground">
              {t("tools.myTimelines.addDialog.matches")}
            </h3>
          )}
          {visibleMatches.map(renderRow)}

          {visibleMatches.length > 0 && visibleOthers.length > 0 && (
            <h3 className="mt-2 text-xs font-semibold text-muted-foreground">
              {t("tools.myTimelines.addDialog.others")}
            </h3>
          )}
          {visibleOthers.map(renderRow)}

          {rows.length > visibleCount && (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 self-center"
              onClick={() => setVisibleCount((count) => count + BATCH_SIZE)}
            >
              {t("common.loadMore")}
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button disabled={selected.length === 0} onClick={handleAdd}>
            <PlusIcon />
            {selected.length > 0
              ? t("tools.myTimelines.addDialog.addCount", {
                  count: selected.length,
                })
              : t("tools.myTimelines.addDialog.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
