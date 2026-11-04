import { useConvexAuth, usePaginatedQuery } from "convex/react";
import { useDebounce } from "@/hooks/use-debounce";
import { api } from "~convex/api";

export function useFormationSearch(search: string, enabled: boolean) {
  const { isAuthenticated } = useConvexAuth();
  const debouncedSearch = useDebounce(search, 250);

  return usePaginatedQuery(
    api.formation.searchOwnPaginated,
    enabled && isAuthenticated
      ? {
          search: debouncedSearch,
        }
      : "skip",
    {
      initialNumItems: 30,
    },
  );
}
