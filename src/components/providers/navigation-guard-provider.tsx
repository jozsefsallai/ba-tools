"use client";

import { type PropsWithChildren, useLayoutEffect, useState } from "react";

import { NavigationGuardContext } from "@/hooks/use-navigation-guard";
import { createNavigationGuardController } from "@/lib/navigation-guard";
import { installNavigationGuardHistory } from "@/lib/navigation-guard-history";

export function NavigationGuardProvider({ children }: PropsWithChildren) {
  const [controller] = useState(createNavigationGuardController);

  useLayoutEffect(() => {
    const uninstallHistory = installNavigationGuardHistory(controller);

    let listening = false;

    function beforeUnload(event: BeforeUnloadEvent) {
      if (!controller.hasEnabledGuards() && !controller.isPending()) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    function syncBeforeUnload() {
      const needed = controller.hasEnabledGuards() || controller.isPending();

      if (needed === listening) {
        return;
      }

      listening = needed;

      if (needed) {
        window.addEventListener("beforeunload", beforeUnload);
      } else {
        window.removeEventListener("beforeunload", beforeUnload);
      }
    }

    const unsubscribe = controller.subscribe(syncBeforeUnload);

    syncBeforeUnload();

    return () => {
      unsubscribe();
      uninstallHistory();
      window.removeEventListener("beforeunload", beforeUnload);
      controller.cancel();
    };
  }, [controller]);

  return (
    <NavigationGuardContext.Provider value={controller}>
      {children}
    </NavigationGuardContext.Provider>
  );
}
