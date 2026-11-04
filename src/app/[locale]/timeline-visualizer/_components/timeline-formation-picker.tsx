"use client";

import type { FunctionReturnType } from "convex/server";
import { ChevronsUpDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useFormationSearch } from "@/hooks/use-formation-search";
import { useStudents } from "@/hooks/use-students";
import { buildStudentPortraitUrl } from "@/lib/url";
import type { api } from "~convex/api";

const PAGE_SIZE = 30;
const LOAD_MORE_THRESHOLD_PX = 100;

export type SavedFormation = FunctionReturnType<
  typeof api.formation.searchOwnPaginated
>["page"][number];

export type TimelineFormationPickerProps = {
  label: string;
  onSelect: (formation: SavedFormation) => void;
  className?: string;
};

function isNearBottom(list: HTMLElement) {
  return (
    list.scrollTop + list.clientHeight >=
    list.scrollHeight - LOAD_MORE_THRESHOLD_PX
  );
}

export function TimelineFormationPicker({
  label,
  onSelect,
  className,
}: TimelineFormationPickerProps) {
  const t = useTranslations();
  const { studentMap } = useStudents();

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const listRef = useRef<HTMLDivElement>(null);
  const { results, status, loadMore } = useFormationSearch(search, open);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [
    open,
    search,
  ]);

  // Filtered pages can come back short, so keep going until the list scrolls.
  useEffect(() => {
    if (
      open &&
      status === "CanLoadMore" &&
      listRef.current &&
      isNearBottom(listRef.current)
    ) {
      loadMore(PAGE_SIZE);
    }
  }, [
    open,
    status,
    results.length,
    loadMore,
  ]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className={className}>
          <span className="truncate">{label}</span>
          <ChevronsUpDownIcon />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[26rem] max-w-[calc(100vw-2rem)] p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("tools.timeline.formation.picker.search")}
            value={search}
            onValueChange={setSearch}
          />

          <CommandList
            ref={listRef}
            onScroll={(event) => {
              if (
                status === "CanLoadMore" &&
                isNearBottom(event.currentTarget)
              ) {
                loadMore(PAGE_SIZE);
              }
            }}
          >
            {status === "LoadingFirstPage" ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t("tools.timeline.formation.picker.loading")}
              </div>
            ) : (
              <CommandEmpty>
                {t("tools.timeline.formation.picker.empty")}
              </CommandEmpty>
            )}

            {results.map((formation) => {
              const firstRow = formation.rows?.[0] ?? formation;

              return (
                <CommandItem
                  key={formation._id}
                  value={formation._id}
                  className="min-h-12 gap-3 px-3 py-2"
                  onSelect={() => {
                    onSelect(formation);
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {formation.name || (
                      <span className="italic text-muted-foreground">
                        {t("common.untitledFormation")}
                      </span>
                    )}
                  </span>

                  <span className="flex shrink-0 gap-0.5">
                    {[
                      ...firstRow.strikers,
                      ...firstRow.specials,
                    ].map((slot, index) => {
                      const student = slot.studentId
                        ? studentMap[slot.studentId]
                        : undefined;

                      return student ? (
                        <img
                          key={`${formation._id}-${index}`}
                          src={buildStudentPortraitUrl(student)}
                          alt=""
                          title={student.name}
                          className="size-7 rounded-sm object-cover max-md:size-6"
                        />
                      ) : (
                        <span
                          key={`${formation._id}-${index}`}
                          className="size-7 rounded-sm border border-dashed max-md:size-6"
                        />
                      );
                    })}
                  </span>
                </CommandItem>
              );
            })}

            {status === "LoadingMore" && (
              <div className="px-3 py-2 text-center text-xs text-muted-foreground">
                {t("common.loadingMore")}
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
