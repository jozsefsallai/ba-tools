"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { OwnTimelineEntry } from "@/app/[locale]/user/timelines/_components/own-timeline-entry";
import { LoadMoreButton } from "@/components/common/list-controls";
import { MessageBox } from "@/components/common/message-box";
import {
  RaidFilterBar,
  useRaidFilterParams,
} from "@/components/raid/raid-filter-bar";
import { useDebounce } from "@/hooks/use-debounce";
import { hasRaidFilters } from "@/lib/raid-info";
import { api } from "~convex/api";

export function OwnTimelineBrowser() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useRaidFilterParams();
  const debouncedSearch = useDebounce(search, 200);
  const hasFilters = hasRaidFilters(filters);
  const isSearching = debouncedSearch.trim().length > 0 || hasFilters;

  const {
    results: paginatedResults,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.timeline.getOwnPaginated,
    isSearching ? "skip" : {},
    {
      initialNumItems: 20,
    },
  );

  const searchResults = useQuery(
    api.timeline.searchOwn,
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

  if (!isSearching && paginatedResults.length === 0 && !search) {
    return (
      <MessageBox>
        <p>{t("tools.myTimelines.ownTimelineBrowser.noTimelines")}</p>
      </MessageBox>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <RaidFilterBar
        scope="timeline"
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {isSearchLoading && <MessageBox>{t("common.loading")}</MessageBox>}

      {!isSearchLoading && items.length === 0 && (
        <MessageBox>
          <p>{t("common.noResults")}</p>
        </MessageBox>
      )}

      {items.map((entry) => (
        <OwnTimelineEntry key={entry._id} entry={entry} />
      ))}

      {!isSearching && <LoadMoreButton status={status} loadMore={loadMore} />}
    </div>
  );
}
