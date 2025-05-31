"use client";

import { ScenarioAffiliation } from "@/app/scenario-image-generator/_components/scenario-affiliation";
import { ScenarioName } from "@/app/scenario-image-generator/_components/scenario-name";
import type { Text } from "pixi.js";
import { useEffect, useRef, useState } from "react";

export type ScenarioNameAndAffiliationProps = {
  name: string;
  affiliation?: string;
};

export function ScenarioNameAndAffiliation({
  name,
  affiliation,
}: ScenarioNameAndAffiliationProps) {
  const nameRef = useRef<Text | null>(null);
  const [nameOffset, setNameOffset] = useState(0);

  useEffect(() => {
    setNameOffset(nameRef.current?.width ?? 0);
  }, [name, nameRef.current]);

  return (
    <>
      <ScenarioName name={name} nameRef={nameRef} />

      {affiliation && (
        <ScenarioAffiliation
          affiliation={affiliation}
          nameOffset={nameOffset}
        />
      )}
    </>
  );
}
