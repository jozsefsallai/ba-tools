"use client";

import { Application, type ApplicationRef, extend } from "@pixi/react";
import { Container, Graphics, Sprite, Text } from "pixi.js";

import { ScenarioBottomGradient } from "@/app/scenario-image-generator/_components/scenario-bottom-gradient";
import { ScenarioButtons } from "@/app/scenario-image-generator/_components/scenario-buttons";
import { ScenarioTriangle } from "@/app/scenario-image-generator/_components/scenario-triangle";
import { ScenarioLine } from "@/app/scenario-image-generator/_components/scenario-line";
import { ScenarioNameAndAffiliation } from "@/app/scenario-image-generator/_components/scenario-name-and-affiliation";
import { ScenarioDialogue } from "@/app/scenario-image-generator/_components/scenario-dialogue";
import { ScenarioBackground } from "@/app/scenario-image-generator/_components/scenario-background";
import { ScenarioCharacter } from "@/app/scenario-image-generator/_components/scenario-character";
import type { RefObject } from "react";
import {
  SCENARIO_VIEW_HEIGHT,
  SCENARIO_VIEW_WIDTH,
} from "@/app/scenario-image-generator/_lib/constants";

export type ScenarioCharacterData = {
  spriteUrl: string;
  x: number;
  y: number;
  scale: number;
};

export type ScenarioViewProps = {
  applicationRef?: RefObject<ApplicationRef | null>;
  content: string;
  fontSize?: number;
  name?: string;
  affiliation?: string;
  displayButtons?: boolean;
  autoEnabled?: boolean;
  displayLine?: boolean;
  displayGradient?: boolean;
  displayTriangle?: boolean;
  backgroundImage?: string;
  characters?: ScenarioCharacterData[];
};

extend({
  Container,
  Graphics,
  Sprite,
  Text,
});

export function ScenarioView({
  applicationRef,
  content,
  fontSize,
  name,
  affiliation,
  displayButtons = true,
  autoEnabled = false,
  displayLine = true,
  displayGradient = true,
  displayTriangle = true,
  backgroundImage,
  characters = [],
}: ScenarioViewProps) {
  return (
    <Application
      ref={applicationRef}
      width={SCENARIO_VIEW_WIDTH}
      height={SCENARIO_VIEW_HEIGHT}
      backgroundColor={0x00000000}
      className="max-w-full"
    >
      {backgroundImage && <ScenarioBackground background={backgroundImage} />}

      {characters.length > 0 &&
        characters.map((character, idx) => (
          <ScenarioCharacter key={idx} {...character} />
        ))}

      {displayGradient && <ScenarioBottomGradient />}
      {displayButtons && <ScenarioButtons autoEnabled={autoEnabled} />}
      {displayTriangle && <ScenarioTriangle />}
      {displayLine && <ScenarioLine />}

      {name && (
        <ScenarioNameAndAffiliation name={name} affiliation={affiliation} />
      )}

      <ScenarioDialogue content={content} fontSize={fontSize} />
    </Application>
  );
}
