"use client";

import { PVPBreadcrumbs } from "@/app/[locale]/pvp/_components/pvp-breadcrumbs";
import { useQueryWithStatus } from "@/lib/convex";
import { useConvexAuth } from "convex/react";
import { type PropsWithChildren, createContext, useContext } from "react";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

function useSeasonDefaultsQuery(seasonId: Id<"pvpSeason">) {
  const { isAuthenticated } = useConvexAuth();

  return useQueryWithStatus(
    api.pvp.getSeasonDefaults,
    isAuthenticated ? { seasonId } : "skip",
  );
}

const SeasonContext = createContext<ReturnType<
  typeof useSeasonDefaultsQuery
> | null>(null);

export function PVPSeasonProvider({
  children,
  seasonId,
}: PropsWithChildren<{ seasonId: Id<"pvpSeason"> }>) {
  const query = useSeasonDefaultsQuery(seasonId);

  return (
    <SeasonContext.Provider value={query}>
      <PVPBreadcrumbs seasonName={query.data?.season?.name}>
        {children}
      </PVPBreadcrumbs>
    </SeasonContext.Provider>
  );
}

function useSeasonContext() {
  const context = useContext(SeasonContext);

  if (!context) {
    throw new Error("PVP season views require PVPSeasonProvider");
  }

  return context;
}

export function usePVPSeasonQuery() {
  const query = useSeasonContext();
  return { ...query, data: query.data?.season };
}

export function usePVPSeasonDefaults() {
  const query = useSeasonContext();

  if (query.status === "error") {
    throw query.error;
  }

  return query.data;
}
