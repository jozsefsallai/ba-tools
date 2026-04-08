"use client";

import { useQueryWithStatus } from "@/lib/convex";
import {
  defaultUserPreferences,
  type UserPreferences,
} from "@/lib/user-preferences";
import { useConvexAuth, useMutation } from "convex/react";
import { type PropsWithChildren, useMemo } from "react";
import { userPreferencesContext } from "@/hooks/use-preferences";
import { api } from "~convex/api";

export function UserPreferencesProvider({ children }: PropsWithChildren) {
  const { isLoading, isAuthenticated } = useConvexAuth();

  const getPreferencesQuery = useQueryWithStatus(
    api.userPreferences.get,
    !isLoading && isAuthenticated ? {} : "skip",
  );

  const savePreferencesMutation = useMutation(api.userPreferences.update);

  async function savePreferences(newPreferences: UserPreferences) {
    await savePreferencesMutation(newPreferences);
  }

  const preferences = useMemo((): UserPreferences => {
    if (getPreferencesQuery.status === "success") {
      const data = getPreferencesQuery.data;
      return {
        timelineVisualizer: {
          ...defaultUserPreferences.timelineVisualizer,
          ...data.timelineVisualizer,
        },
        formationDisplay: {
          ...defaultUserPreferences.formationDisplay,
          ...data.formationDisplay,
        },
      };
    }

    return defaultUserPreferences;
  }, [getPreferencesQuery]);

  return (
    <userPreferencesContext.Provider
      value={{
        preferences,
        savePreferences,
      }}
    >
      {children}
    </userPreferencesContext.Provider>
  );
}
