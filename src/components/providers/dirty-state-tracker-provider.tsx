"use client";

import {
  type DirtyStateTrackerProviderOptions,
  type DirtyStateTrackerRegistryEntry,
  dirtyStateTrackerContext,
} from "@/hooks/use-dirty-state-tracker";
import { type PropsWithChildren, useCallback, useRef, useState } from "react";

export function DirtyStateTrackerProvider({
  children,
  ...options
}: PropsWithChildren<DirtyStateTrackerProviderOptions>) {
  const stateRegistry = useRef(
    new Map<string | symbol, DirtyStateTrackerRegistryEntry>(),
  ).current;
  const [forceUpdateSignal, setForceUpdateSignal] = useState(false);

  const pendingRef = useRef(false);

  const tickForceUpdate = useCallback(() => {
    if (pendingRef.current) {
      return;
    }

    pendingRef.current = true;

    Promise.resolve().then(() => {
      pendingRef.current = false;
      setForceUpdateSignal((v) => !v);
    });
  }, []);

  const markDirty = useCallback(
    (key: string | symbol, isDirty: boolean) => {
      const entry = stateRegistry.get(key);
      if (entry && entry.isDirty !== isDirty) {
        entry.isDirty = isDirty;
        tickForceUpdate();
      }
    },
    [stateRegistry, tickForceUpdate],
  );

  return (
    <dirtyStateTrackerContext.Provider
      value={{
        markDirty,
        stateRegistry,
        forceUpdateSignal,
        tickForceUpdate,
        options,
      }}
    >
      {children}
    </dirtyStateTrackerContext.Provider>
  );
}
