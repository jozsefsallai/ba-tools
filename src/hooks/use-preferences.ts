import { createContext, useContext } from "react";
import {
  defaultUserPreferences,
  type UserPreferences,
} from "@/lib/user-preferences";

export type UserPreferencesContext = {
  preferences: UserPreferences;
  savePreferences: (newPreferences: UserPreferences) => Promise<void>;
};

export const userPreferencesContext = createContext<UserPreferencesContext>({
  preferences: defaultUserPreferences,
  savePreferences: async (_) => void 0,
});

export function useUserPreferences() {
  const context = useContext(userPreferencesContext);
  return context;
}
