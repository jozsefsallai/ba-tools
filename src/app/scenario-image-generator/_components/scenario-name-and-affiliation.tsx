"use client";

import { ScenarioAffiliation } from "@/app/scenario-image-generator/_components/scenario-affiliation";
import { ScenarioName } from "@/app/scenario-image-generator/_components/scenario-name";
import type { Text } from "pixi.js";
import { useEffect, useRef, useState } from "react";

export type ScenarioNameAndAffiliationProps = {
  name: string;
  affiliation?: string;
  fontFamily: string;
  nameY?: number;
  affiliationY?: number;
};

export function ScenarioNameAndAffiliation({
  name,
  affiliation,
  fontFamily,
  nameY,
  affiliationY,
}: ScenarioNameAndAffiliationProps) {
  const nameRef = useRef<Text | null>(null);
  const [nameOffset, setNameOffset] = useState(0);

  useEffect(() => {
    setNameOffset(nameRef.current?.width ?? 0);
  }, [name, nameRef.current, fontFamily]);

  return (
    <>
      <ScenarioName
        name={name}
        nameRef={nameRef}
        fontFamily={fontFamily}
        y={nameY}
      />

      {affiliation && (
        <ScenarioAffiliation
          affiliation={affiliation}
          nameOffset={nameOffset}
          fontFamily={fontFamily}
          y={affiliationY}
        />
      )}
    </>
  );
}
