import { usePaginatedQuery, useQuery } from "convex/react";
import { useMemo } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useStudents } from "@/hooks/use-students";
import {
  normalizeStudentSearchQuery,
  orderStudentsByFuzzyNameQuery,
} from "@/lib/student-search-query";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

const MAX_REP_STUDENTS = 10;

export function usePVPEnemyPresetSearch(
  seasonId: Id<"pvpSeason">,
  search: string,
) {
  const { students } = useStudents();
  const debouncedSearch = useDebounce(search, 250);

  const nameResults = usePaginatedQuery(
    api.pvp.listEnemyPresets,
    {
      seasonId,
      search: debouncedSearch,
    },
    {
      initialNumItems: 30,
    },
  );

  const repStudentIds = useMemo(() => {
    if (!normalizeStudentSearchQuery(debouncedSearch)) {
      return [];
    }

    return orderStudentsByFuzzyNameQuery(students, debouncedSearch.trim())
      .ordered.slice(0, MAX_REP_STUDENTS)
      .map((student) => student.id);
  }, [
    students,
    debouncedSearch,
  ]);

  const repResults = useQuery(
    api.pvp.listEnemyPresetsByStudentRep,
    repStudentIds.length > 0
      ? {
          seasonId,
          search: debouncedSearch,
          studentIds: repStudentIds,
        }
      : "skip",
  );

  return {
    ...nameResults,
    repResults:
      repStudentIds.length > 0 && nameResults.status === "Exhausted"
        ? (repResults ?? [])
        : [],
  };
}
