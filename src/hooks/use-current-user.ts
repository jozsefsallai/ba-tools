"use client";

import { useConvexAuth } from "convex/react";
import { useQueryWithStatus } from "@/lib/convex";
import { api } from "~convex/api";

export function useCurrentUser() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  const query = useQueryWithStatus(
    api.users.getMe,
    !isLoading && isAuthenticated ? {} : "skip",
  );

  return query.status === "success" ? query.data : undefined;
}
