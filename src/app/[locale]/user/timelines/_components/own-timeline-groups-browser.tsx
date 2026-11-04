"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { GlobeIcon, LayersIcon, LockIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LoadMoreButton } from "@/components/common/list-controls";
import { MessageBox } from "@/components/common/message-box";
import { RaidChips } from "@/components/raid/raid-chips";
import {
  RaidFilterBar,
  useRaidFilterParams,
} from "@/components/raid/raid-filter-bar";
import { useDebounce } from "@/hooks/use-debounce";
import { Link } from "@/i18n/navigation";
import { hasRaidFilters } from "@/lib/raid-info";
import { getRaidBossLabel } from "@/lib/raid-labels";
import { getRaidArt } from "@/lib/roadmap/raid-images";
import { buildStudentIconUrlFromId } from "@/lib/url";
import { api } from "~convex/api";

type GroupCardData = FunctionReturnType<
  typeof api.timelineGroup.searchOwn
>[number];

export function OwnTimelineGroupsBrowser() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useRaidFilterParams();
  const debouncedSearch = useDebounce(search, 200);
  const isSearching =
    debouncedSearch.trim().length > 0 || hasRaidFilters(filters);

  const {
    results: paginatedResults,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.timelineGroup.listOwnCards,
    isSearching ? "skip" : {},
    {
      initialNumItems: 20,
    },
  );

  const searchResults = useQuery(
    api.timelineGroup.searchOwn,
    isSearching
      ? {
          search: debouncedSearch.trim(),
          filters,
        }
      : "skip",
  );

  const items = isSearching ? (searchResults ?? []) : paginatedResults;
  const isInitialLoad = !isSearching && status === "LoadingFirstPage";
  const isSearchLoading = isSearching && searchResults === undefined;

  if (isInitialLoad) {
    return <MessageBox>{t("common.loading")}</MessageBox>;
  }

  return (
    <div className="flex flex-col gap-4">
      <RaidFilterBar
        scope="group"
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {isSearchLoading && <MessageBox>{t("common.loading")}</MessageBox>}

      {!isSearchLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {!isSearching && <AllTimelinesCard />}

          {items.length === 0 && isSearching && (
            <MessageBox className="md:col-span-2">
              <p>{t("common.noResults")}</p>
            </MessageBox>
          )}

          {items.map((group) => (
            <GroupCard key={group._id} group={group} />
          ))}
        </div>
      )}

      {!isSearching && <LoadMoreButton status={status} loadMore={loadMore} />}
    </div>
  );
}

function AllTimelinesCard() {
  const t = useTranslations();

  return (
    <Link href="/user/timelines/ungrouped" className="group">
      <div className="flex h-full min-h-32 items-center gap-4 rounded-lg border border-dashed bg-muted/40 p-4 transition-colors group-hover:border-foreground/30 group-hover:bg-accent">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-background">
          <LayersIcon className="size-5 text-muted-foreground" />
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-lg font-bold">
            {t("tools.myTimelines.allTimelines")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("tools.myTimelines.allTimelinesGroupDescription")}
          </p>
        </div>
      </div>
    </Link>
  );
}

function GroupCard({ group }: { group: GroupCardData }) {
  const t = useTranslations();

  const raid = group.resolvedRaid;
  const art = raid ? getRaidArt(raid.type, raid.boss) : null;
  const boss = raid ? getRaidBossLabel(t, raid.type, raid.boss) : undefined;

  return (
    <Link href={`/user/timelines/${group._id}`} className="group">
      <div className="relative flex h-full min-h-32 flex-col gap-3 overflow-hidden rounded-lg border bg-card p-4 transition-colors group-hover:border-foreground/30 group-hover:bg-accent">
        {art && (
          <img
            src={art.image.src}
            alt=""
            draggable={false}
            loading="lazy"
            className="pointer-events-none absolute inset-y-0 right-0 h-full w-3/5 object-cover object-center opacity-25 [mask-image:linear-gradient(to_right,transparent,black)] dark:opacity-30"
          />
        )}

        <div className="relative flex min-w-0 items-start justify-between gap-2">
          <h2 className="min-w-0 text-lg font-bold wrap-break-word">
            {group.name}
          </h2>

          {group.visibility === "public" ? (
            <GlobeIcon
              aria-label={t("common.public")}
              className="mt-1.5 size-4 shrink-0 text-muted-foreground"
            />
          ) : (
            <LockIcon
              aria-label={t("common.private")}
              className="mt-1.5 size-4 shrink-0 text-muted-foreground"
            />
          )}
        </div>

        {raid && (
          <div className="relative flex flex-wrap items-center gap-x-2 gap-y-1">
            <RaidChips raid={raid} />
            {boss && !group.name.includes(boss) && (
              <span className="text-xs font-medium">{boss}</span>
            )}
          </div>
        )}

        <div className="relative mt-auto flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {t("tools.myTimelines.groupContains", {
              count: group.timelineCount,
            })}
          </p>

          {group.previewStudentIds.length > 0 && (
            <div className="flex -space-x-2">
              {group.previewStudentIds.map((id) => (
                <img
                  key={id}
                  src={buildStudentIconUrlFromId(id)}
                  alt=""
                  draggable={false}
                  loading="lazy"
                  className="size-7 rounded-full border-2 border-card bg-background object-cover"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
