"use client";

import type { NavigationGuardController } from "@/lib/navigation-guard";
import {
  createContext,
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export const NavigationGuardContext =
  createContext<NavigationGuardController | null>(null);

export function useNavigationGuardController() {
  return useContext(NavigationGuardContext);
}

export function useNavigationGuard({
  enabled,
}: { enabled: boolean | (() => boolean) }) {
  const controller = useNavigationGuardController();
  if (!controller) {
    throw new Error("useNavigationGuard requires NavigationGuardProvider");
  }

  const id = useId();
  const enabledRef = useRef(enabled);
  const [active, setActive] = useState(false);

  useLayoutEffect(() => {
    enabledRef.current = enabled;
    controller.notify();
  });

  useLayoutEffect(
    () =>
      controller.register(id, {
        isEnabled: () =>
          typeof enabledRef.current === "function"
            ? enabledRef.current()
            : enabledRef.current,
        setActive,
      }),
    [controller, id],
  );

  const accept = useCallback(() => controller.accept(id), [controller, id]);
  const reject = useCallback(() => controller.reject(id), [controller, id]);

  return { active, accept, reject };
}
