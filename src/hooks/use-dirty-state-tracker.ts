import { useAuth } from "@clerk/nextjs";
import {
  createContext,
  type SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type React from "react";

export type DirtyStateTrackerProviderOptions = {
  loggedInOnly?: boolean;
};

export type DirtyStateTrackerHookOptions = {
  enabled?: boolean;
};

export type DirtyStateTrackerRegistryEntry = {
  currentValue: any;
  lastSavedValue: any;
  isDirty: boolean;
  equalityFn?: (a: any, b: any) => boolean;
};

export type DirtyStateTrackerContext = {
  markDirty(key: string | symbol, isDirty: boolean): void;
  stateRegistry: Map<string | symbol, DirtyStateTrackerRegistryEntry>;
  forceUpdateSignal: boolean;
  tickForceUpdate(): void;
  options: DirtyStateTrackerProviderOptions;
};

export const dirtyStateTrackerContext = createContext<DirtyStateTrackerContext>(
  {
    markDirty: () => {},
    stateRegistry: new Map(),
    forceUpdateSignal: false,
    tickForceUpdate: () => {},
    options: {},
  },
);

function equals<T>(a: T, b: T): boolean {
  if (a === b) {
    return true;
  }

  if (a === null || a === undefined || b === null || b === undefined) {
    return false;
  }

  const typeA = typeof a;
  const typeB = typeof b;

  if (typeA !== typeB) {
    return false;
  }

  if (typeA !== "object" && typeA !== "function") {
    return a === b;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }

    for (let i = 0; i < a.length; i++) {
      if (!equals(a[i], b[i])) {
        return false;
      }
    }

    return true;
  }

  if (typeA === "object" && typeB === "object") {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) {
      return false;
    }

    for (let i = 0; i < keysA.length; i++) {
      const key = keysA[i];
      if (!Object.prototype.hasOwnProperty.call(b, key)) {
        return false;
      }

      if (!equals((a as any)[key], (b as any)[key])) {
        return false;
      }
    }

    return true;
  }

  return a === b;
}

export function useDirtyStateTracker(
  { enabled }: DirtyStateTrackerHookOptions = {
    enabled: true,
  },
) {
  const context = useContext(dirtyStateTrackerContext);

  const { isSignedIn } = useAuth();

  const {
    markDirty,
    stateRegistry,
    forceUpdateSignal,
    tickForceUpdate,
    options,
  } = context;

  const [mounted, setMounted] = useState(false);

  const hasUnsavedChanges = useMemo(() => {
    if (!enabled || (options.loggedInOnly && !isSignedIn)) {
      return false;
    }

    for (const state of Array.from(stateRegistry.values())) {
      if (state.isDirty) {
        return true;
      }
    }

    return false;
  }, [
    enabled,
    options.loggedInOnly,
    isSignedIn,
    stateRegistry,
    forceUpdateSignal,
  ]);

  const markAsSaved = useCallback(() => {
    if (!enabled || (options.loggedInOnly && !isSignedIn)) {
      return;
    }

    for (const [key, state] of Array.from(stateRegistry.entries())) {
      state.lastSavedValue = state.currentValue;
      markDirty(key, false);
    }
  }, [enabled, stateRegistry, markDirty]);

  const useSaveableState = useCallback(
    <T>(
      initialState: T | (() => T),
      equalityFn?: (a: T, b: T) => boolean,
      key?: string,
    ): [
      T,
      React.Dispatch<SetStateAction<T>>,
      React.Dispatch<SetStateAction<T>>,
    ] => {
      const stateKey = useRef(key ?? Symbol("SaveableState")).current;
      const [value, setValue] = useState<T>(initialState);

      useEffect(() => {
        if (!mounted) {
          return;
        }

        stateRegistry.set(stateKey, {
          currentValue: value,
          lastSavedValue: value,
          isDirty: false,
          equalityFn,
        });

        return () => {
          stateRegistry.delete(stateKey);
          tickForceUpdate();
        };
      }, [
        stateKey,
        equalityFn,
        markDirty,
        stateRegistry,
        tickForceUpdate,
        mounted,
      ]);

      const setSaveableValue: React.Dispatch<SetStateAction<T>> = useCallback(
        (newValue) => {
          setValue((prev) => {
            const resolvedValue =
              typeof newValue === "function"
                ? (newValue as (prevState: T) => T)(prev)
                : newValue;

            const entry = stateRegistry.get(stateKey);

            if (entry) {
              entry.currentValue = resolvedValue;

              const newDirtyStatus = equalityFn
                ? !equalityFn(entry.currentValue, entry.lastSavedValue)
                : !equals(entry.currentValue, entry.lastSavedValue);

              markDirty(stateKey, newDirtyStatus);
            }

            return resolvedValue;
          });
        },
        [stateKey, equalityFn, markDirty, stateRegistry],
      );

      const setValueUnchecked = useCallback((newValue: SetStateAction<T>) => {
        const resolvedValue =
          typeof newValue === "function"
            ? (newValue as (prevState: T) => T)(value)
            : newValue;

        setValue(resolvedValue);

        const entry = stateRegistry.get(stateKey);

        if (entry) {
          entry.currentValue = resolvedValue;
          entry.lastSavedValue = resolvedValue;
          entry.isDirty = false;
        }
      }, []);

      return [value, setSaveableValue, setValueUnchecked];
    },
    [stateRegistry, markDirty, tickForceUpdate, mounted],
  );

  useEffect(() => {
    setMounted(true);

    return () => {
      setMounted(false);
    };
  }, []);

  return {
    useSaveableState,
    hasUnsavedChanges,
    markAsSaved,
  };
}
