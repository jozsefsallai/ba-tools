"use client";

import { FormationEntry } from "@/app/user/formations/_components/formation-entry";
import { LoadMoreButton, SearchBar } from "@/components/common/list-controls";
import { MessageBox } from "@/components/common/message-box";
import { useDebounce } from "@/hooks/use-debounce";
import { usePaginatedQuery, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { api } from "~convex/api";

export function FormationsBrowser() {
  const t = useTranslations();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 200);
  const isSearching = debouncedSearch.trim().length > 0;

  const {
    results: paginatedResults,
    status,
    loadMore,
  } = usePaginatedQuery(
    api.formation.getOwnPaginated,
    isSearching ? "skip" : {},
    { initialNumItems: 20 },
  );

  const searchResults = useQuery(
    api.formation.searchOwn,
    isSearching ? { search: debouncedSearch.trim() } : "skip",
  );

  const items = isSearching ? (searchResults ?? []) : paginatedResults;
  const isInitialLoad =
    !isSearching && status === "LoadingFirstPage";
  const isSearchLoading = isSearching && searchResults === undefined;

  if (isInitialLoad) {
    return <MessageBox>{t("common.loading")}</MessageBox>;
  }

  if (paginatedResults.length === 0 && !search) {
    return (
      <MessageBox>
        <p>{t("tools.formationDisplay.myFormations.noFormations")}</p>
      </MessageBox>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchBar value={search} onChange={setSearch} />

      {isSearchLoading && <MessageBox>{t("common.loading")}</MessageBox>}

      {!isSearchLoading && items.length === 0 && (
        <MessageBox>
          <p>{t("common.noResults")}</p>
        </MessageBox>
      )}

      {items.map((formation) => (
        <FormationEntry key={formation._id} entry={formation} />
      ))}

      {!isSearching && (
        <LoadMoreButton status={status} loadMore={loadMore} />
      )}
    </div>
  );
}
