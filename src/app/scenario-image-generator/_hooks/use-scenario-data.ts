"use client";

import type { ScenarioCharacterData } from "@/app/scenario-image-generator/_components/scenario-view";
import {
  SCENARIO_TEXT_FONT_SIZE,
  SCENARIO_TEXT_SCROLL_SPEED,
} from "@/app/scenario-image-generator/_lib/constants";
import type { ApplicationRef } from "@pixi/react";
import {
  createContext,
  type Dispatch,
  type RefObject,
  type SetStateAction,
  useContext,
} from "react";

export type BackgroundMode = "image" | "url";

export type ScenarioDataContext = {
  applicationRef: RefObject<ApplicationRef | null>;
  backgroundMode: BackgroundMode;
  setBackgroundMode: Dispatch<SetStateAction<BackgroundMode>>;
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  affiliation: string;
  setAffiliation: Dispatch<SetStateAction<string>>;
  content: string;
  setContent: Dispatch<SetStateAction<string>>;
  fontSize: number;
  setFontSize: Dispatch<SetStateAction<number>>;
  scrollSpeed: number;
  setScrollSpeed: Dispatch<SetStateAction<number>>;
  backgroundImage: string | null;
  setBackgroundImage: Dispatch<SetStateAction<string | null>>;
  backgroundUrl: string | null;
  setBackgroundUrl: Dispatch<SetStateAction<string | null>>;
  backgroundScale: number;
  setBackgroundScale: Dispatch<SetStateAction<number>>;
  backgroundXOffset: number;
  setBackgroundXOffset: Dispatch<SetStateAction<number>>;
  backgroundYOffset: number;
  setBackgroundYOffset: Dispatch<SetStateAction<number>>;
  characters: (ScenarioCharacterData & {
    filename: string;
    timestamp: number;
  })[];
  setCharacters: Dispatch<
    SetStateAction<
      (ScenarioCharacterData & {
        filename: string;
        timestamp: number;
      })[]
    >
  >;
  displayButtons: boolean;
  setDisplayButtons: Dispatch<SetStateAction<boolean>>;
  autoEnabled: boolean;
  setAutoEnabled: Dispatch<SetStateAction<boolean>>;
  displayLine: boolean;
  setDisplayLine: Dispatch<SetStateAction<boolean>>;
  displayGradient: boolean;
  setDisplayGradient: Dispatch<SetStateAction<boolean>>;
  displayTriangle: boolean;
  setDisplayTriangle: Dispatch<SetStateAction<boolean>>;
  transparentBackground: boolean;
  setTransparentBackground: Dispatch<SetStateAction<boolean>>;
  animate: boolean;
  setAnimate: Dispatch<SetStateAction<boolean>>;
  recordingMode: boolean;
  setRecordingMode: Dispatch<SetStateAction<boolean>>;
  backgroundName: string | null;
  setBackgroundName: Dispatch<SetStateAction<string | null>>;
  backgroundInputRef: RefObject<HTMLInputElement | null>;
  characterInputRef: RefObject<HTMLInputElement | null>;
  background: string | null;
};

export const scenarioDataContext = createContext<ScenarioDataContext>({
  applicationRef: null as unknown as RefObject<ApplicationRef | null>,
  backgroundMode: "image",
  setBackgroundMode: () => {},
  name: "Name",
  setName: () => {},
  affiliation: "Affiliation",
  setAffiliation: () => {},
  content: "Dialogue text goes here...",
  setContent: () => {},
  fontSize: SCENARIO_TEXT_FONT_SIZE,
  setFontSize: () => {},
  scrollSpeed: SCENARIO_TEXT_SCROLL_SPEED,
  setScrollSpeed: () => {},
  backgroundImage: null,
  setBackgroundImage: () => {},
  backgroundUrl: null,
  setBackgroundUrl: () => {},
  backgroundScale: 1,
  setBackgroundScale: () => {},
  backgroundXOffset: 0,
  setBackgroundXOffset: () => {},
  backgroundYOffset: 0,
  setBackgroundYOffset: () => {},
  characters: [],
  setCharacters: () => {},
  displayButtons: true,
  setDisplayButtons: () => {},
  autoEnabled: false,
  setAutoEnabled: () => {},
  displayLine: true,
  setDisplayLine: () => {},
  displayGradient: true,
  setDisplayGradient: () => {},
  displayTriangle: true,
  setDisplayTriangle: () => {},
  transparentBackground: false,
  setTransparentBackground: () => {},
  animate: false,
  setAnimate: () => {},
  recordingMode: false,
  setRecordingMode: () => {},
  backgroundName: null,
  setBackgroundName: () => {},
  backgroundInputRef: null as unknown as RefObject<HTMLInputElement | null>,
  characterInputRef: null as unknown as RefObject<HTMLInputElement | null>,
  background: null,
});

export function useScenarioData() {
  const context = useContext(scenarioDataContext);
  return context;
}
