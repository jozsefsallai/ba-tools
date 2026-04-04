"use client";

import { LoadMoreButton, SearchBar } from "@/components/common/list-controls";
import { MessageBox } from "@/components/common/message-box";
import { useDebounce } from "@/hooks/use-debounce";
import { usePaginatedQuery, useQuery } from "convex/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { api } from "~convex/api";
import type { Doc } from "~convex/dataModel";

export function OwnTimelineGroupsBrowser() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);
  const isSearching = debouncedSearch.trim().length > 0;

  const {
    results: paginatedResults,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.timelineGroup.getOwnPaginated,
    isSearching ? "skip" : {},
    { initialNumItems: 20 },
  );

  const searchResults = useQuery(
    api.timelineGroup.searchOwn,
    isSearching ? { search: debouncedSearch.trim() } : "skip",
  );

  const ungrouped = useMemo<Doc<"timelineGroup">>(
    () => ({
      _id: "ungrouped" as any,
      name: t("tools.myTimelines.allTimelines"),
      description: t("tools.myTimelines.allTimelinesDescription"),
      visibility: "private" as const,
      showCreator: false,
      userId: "system" as any,
      timelines: [],
      _creationTime: new Date().getTime(),
    }),
    [t],
  );

  const items = isSearching ? (searchResults ?? []) : paginatedResults;
  const isInitialLoad =
    !isSearching && status === "LoadingFirstPage";
  const isSearchLoading = isSearching && searchResults === undefined;

  if (isInitialLoad) {
    return <MessageBox>{t("common.loading")}</MessageBox>;
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchBar value={search} onChange={setSearch} />

      {isSearchLoading && <MessageBox>{t("common.loading")}</MessageBox>}

      {!isSearchLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!isSearching && <GroupCard group={ungrouped} />}

          {items.length === 0 && isSearching && (
            <MessageBox>
              <p>{t("common.noResults")}</p>
            </MessageBox>
          )}

          {items.map((group) => (
            <GroupCard key={group._id} group={group} />
          ))}
        </div>
      )}

      {!isSearching && (
        <LoadMoreButton status={status} loadMore={loadMore} />
      )}
    </div>
  );
}

function GroupCard({ group }: { group: Doc<"timelineGroup"> }) {
  const t = useTranslations();

  return (
    <Link href={`/user/timelines/${group._id}`}>
      <div className="h-full flex flex-col gap-2 border rounded-md p-4 hover:bg-accent relative">
        <h2 className="text-lg font-bold">{group.name}</h2>

        <p className="text-sm text-muted-foreground">
          {group._id === ("ungrouped" as any)
            ? t("tools.myTimelines.allTimelinesGroupDescription")
            : t("tools.myTimelines.groupContains", {
                count: group.timelines.length,
              })}
        </p>

        <p className="text-xs text-muted-foreground">
          <strong>{`${t("common.visibility")}:`}</strong>{" "}
          {group.visibility === "private"
            ? t("common.private")
            : t("common.public")}
        </p>
      </div>
    </Link>
  );
}
