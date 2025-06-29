"use client";

import type { ScenarioCharacterData } from "@/app/scenario-image-generator/_components/scenario-view";
import type { BackgroundMode } from "@/app/scenario-image-generator/_hooks/use-scenario-data";
import {
  SCENARIO_TEXT_FONT_SIZE,
  SCENARIO_TEXT_SCROLL_SPEED,
} from "@/app/scenario-image-generator/_lib/constants";
import type { ApplicationRef } from "@pixi/react";
import { type PropsWithChildren, useMemo, useRef, useState } from "react";
import { scenarioDataContext } from "@/app/scenario-image-generator/_hooks/use-scenario-data";

export function ScenarioDataProvider({ children }: PropsWithChildren) {
  const applicationRef = useRef<ApplicationRef | null>(null);

  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>("image");

  const [name, setName] = useState("Name");
  const [affiliation, setAffiliation] = useState<string>("Affiliation");
  const [content, setContent] = useState("Dialogue text goes here...");
  const [fontSize, setFontSize] = useState(SCENARIO_TEXT_FONT_SIZE);
  const [scrollSpeed, setScrollSpeed] = useState(SCENARIO_TEXT_SCROLL_SPEED);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [characters, setCharacters] = useState<
    (ScenarioCharacterData & {
      filename: string;
      timestamp: number;
    })[]
  >([]);
  const [displayButtons, setDisplayButtons] = useState(true);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [displayLine, setDisplayLine] = useState(true);
  const [displayGradient, setDisplayGradient] = useState(true);
  const [displayTriangle, setDisplayTriangle] = useState(true);
  const [transparentBackground, setTransparentBackground] = useState(false);

  const [animate, setAnimate] = useState(false);
  const [recordingMode, setRecordingMode] = useState(false);

  const [backgroundName, setBackgroundName] = useState<string | null>(null);

  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const characterInputRef = useRef<HTMLInputElement | null>(null);

  const background = useMemo(() => {
    switch (backgroundMode) {
      case "image":
        return backgroundImage;
      case "url":
        return backgroundUrl;
    }
  }, [backgroundMode, backgroundImage, backgroundUrl]);

  return (
    <scenarioDataContext.Provider
      value={{
        applicationRef,
        backgroundMode,
        setBackgroundMode,
        name,
        setName,
        affiliation,
        setAffiliation,
        content,
        setContent,
        fontSize,
        setFontSize,
        scrollSpeed,
        setScrollSpeed,
        backgroundImage,
        setBackgroundImage,
        backgroundUrl,
        setBackgroundUrl,
        characters,
        setCharacters,
        displayButtons,
        setDisplayButtons,
        autoEnabled,
        setAutoEnabled,
        displayLine,
        setDisplayLine,
        displayGradient,
        setDisplayGradient,
        displayTriangle,
        setDisplayTriangle,
        transparentBackground,
        setTransparentBackground,

        animate,
        setAnimate,
        recordingMode,
        setRecordingMode,

        backgroundName,
        setBackgroundName,

        backgroundInputRef,
        characterInputRef,

        background,
      }}
    >
      {children}
    </scenarioDataContext.Provider>
  );
}
