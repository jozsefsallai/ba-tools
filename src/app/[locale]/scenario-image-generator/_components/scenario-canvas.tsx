"use client";

import {
  ScenarioRenderer,
  setActiveScenarioRenderer,
} from "@/app/[locale]/scenario-image-generator/_lib/renderer/scenario-renderer";
import {
  scenarioStore,
  useScenarioStore,
} from "@/app/[locale]/scenario-image-generator/_lib/store";
import { MessageBox } from "@/components/common/message-box";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export function ScenarioCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);

  const recordingMode = useScenarioStore((state) => state.recordingMode);

  useEffect(() => {
    const host = containerRef.current;
    if (!host) {
      return;
    }

    let disposed = false;
    let renderer: ScenarioRenderer | null = null;
    let unsubscribe: (() => void) | null = null;

    ScenarioRenderer.create(host).then((created) => {
      if (disposed) {
        created.destroy();
        return;
      }

      renderer = created;
      setActiveScenarioRenderer(created);

      created.sync(scenarioStore.getState());
      unsubscribe = scenarioStore.subscribe(() => {
        created.sync(scenarioStore.getState());
      });

      setLoading(false);
    });

    return () => {
      disposed = true;
      unsubscribe?.();
      setActiveScenarioRenderer(null);
      renderer?.destroy();
    };
  }, []);

  return (
    <>
      {loading && (
        <MessageBox className="px-10">Loading asset bundles...</MessageBox>
      )}

      <div
        ref={containerRef}
        className={cn("max-w-full [&>canvas]:max-w-full", {
          hidden: loading,
          "fixed top-1/2 -translate-y-1/2 left-0 w-full z-50 [&>canvas]:w-full":
            recordingMode,
        })}
      />
    </>
  );
}
