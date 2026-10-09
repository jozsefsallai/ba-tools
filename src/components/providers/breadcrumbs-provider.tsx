"use client";

import { usePathname } from "@/i18n/navigation";
import {
  type BreadcrumbRegistration,
  type PageBreadcrumb,
  resolveBreadcrumbs,
} from "@/lib/breadcrumbs";
import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

const BreadcrumbsContext = createContext<PageBreadcrumb[]>([]);
const BreadcrumbDepthContext = createContext(0);
const RegistrationContext = createContext<
  ((id: string, registration?: BreadcrumbRegistration) => void) | null
>(null);

export function BreadcrumbsProvider({
  children,
  fallback,
}: PropsWithChildren<{ fallback: PageBreadcrumb[] }>) {
  const pathname = usePathname();

  const [registrations, setRegistrations] = useState(
    new Map<string, BreadcrumbRegistration>(),
  );

  const register = useCallback(
    (id: string, registration?: BreadcrumbRegistration) => {
      setRegistrations((previous) => {
        const next = new Map(previous);

        if (registration) {
          next.set(id, registration);
        } else {
          next.delete(id);
        }

        return next;
      });
    },
    [],
  );

  const items = resolveBreadcrumbs(registrations.values(), pathname, fallback);

  return (
    <RegistrationContext.Provider value={register}>
      <BreadcrumbsContext.Provider value={items}>
        {children}
      </BreadcrumbsContext.Provider>
    </RegistrationContext.Provider>
  );
}

export function BreadcrumbScope({
  children,
  items,
}: PropsWithChildren<{ items: PageBreadcrumb[] }>) {
  const pathname = usePathname();

  const parentDepth = useContext(BreadcrumbDepthContext);
  const register = useContext(RegistrationContext);

  const id = useId();

  const serialized = JSON.stringify(items);

  const stableItems = useMemo(
    () => JSON.parse(serialized) as PageBreadcrumb[],
    [serialized],
  );

  const depth = parentDepth + 1;

  useLayoutEffect(() => {
    if (!register) {
      throw new Error("BreadcrumbScope requires BreadcrumbsProvider");
    }

    register(id, { pathname, depth, items: stableItems });
    return () => register(id);
  }, [register, id, pathname, depth, stableItems]);

  return (
    <BreadcrumbDepthContext.Provider value={depth}>
      {children}
    </BreadcrumbDepthContext.Provider>
  );
}

export function useBreadcrumbs() {
  return useContext(BreadcrumbsContext);
}
