"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";
import type { RaidInfo } from "@/lib/raid-info";
import { buildRaidName } from "@/lib/raid-labels";

type UseAutoNameOptions = {
  raid: RaidInfo | null | undefined;
  autoName: boolean;
  setName: (name: string) => void;
  setAutoName: (autoName: boolean) => void;
};

export function useAutoName({
  raid,
  autoName,
  setName,
  setAutoName,
}: UseAutoNameOptions) {
  const t = useTranslations();
  const generated = buildRaidName(t, raid);
  const lastGenerated = useRef(generated);

  useEffect(() => {
    if (lastGenerated.current === generated) {
      return;
    }

    lastGenerated.current = generated;

    if (autoName) {
      setName(generated);
    }
  }, [
    generated,
  ]);

  const onNameChange = useCallback(
    (name: string) => {
      setName(name);
      setAutoName(name.length === 0);
    },
    [
      setName,
      setAutoName,
    ],
  );

  const seedAutoName = useCallback(
    (loadedRaid: RaidInfo | null | undefined) => {
      lastGenerated.current = buildRaidName(t, loadedRaid);
    },
    [
      t,
    ],
  );

  return {
    onNameChange,
    seedAutoName,
  };
}

export function getInitialAutoName(
  name: string | null | undefined,
  autoName: boolean | undefined,
) {
  return autoName ?? !name;
}
