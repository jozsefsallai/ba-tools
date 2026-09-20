"use client";

import {
  SCENARIO_TEXT_FONT_SIZE,
  SCENARIO_TEXT_SCROLL_SPEED,
} from "@/app/[locale]/scenario-image-generator/_lib/constants";
import { SCENARIO_FONT_EN } from "@/app/[locale]/scenario-image-generator/_lib/fonts";
import type {
  BackgroundMode,
  ScenarioCharacterData,
  ScenarioFontData,
} from "@/app/[locale]/scenario-image-generator/_lib/types";
import { useSyncExternalStore } from "react";

export type ScenarioState = {
  backgroundMode: BackgroundMode;
  name: string;
  affiliation: string;
  content: string;
  font: ScenarioFontData;
  fontSize: number;
  scrollSpeed: number;
  backgroundImage: string | null;
  backgroundUrl: string | null;
  backgroundScale: number;
  backgroundXOffset: number;
  backgroundYOffset: number;
  characters: ScenarioCharacterData[];
  displayButtons: boolean;
  autoEnabled: boolean;
  displayLine: boolean;
  displayGradient: boolean;
  displayTriangle: boolean;
  transparentBackground: boolean;
  animate: boolean;
  recordingMode: boolean;
  backgroundName: string | null;
  script: string;
  scriptPlaying: boolean;
};

const initialState: ScenarioState = {
  backgroundMode: "image",
  name: "Name",
  affiliation: "Affiliation",
  content: "Dialogue text goes here...",
  font: SCENARIO_FONT_EN,
  fontSize: SCENARIO_TEXT_FONT_SIZE,
  scrollSpeed: SCENARIO_TEXT_SCROLL_SPEED,
  backgroundImage: null,
  backgroundUrl: null,
  backgroundScale: 1,
  backgroundXOffset: 0,
  backgroundYOffset: 0,
  characters: [],
  displayButtons: true,
  autoEnabled: false,
  displayLine: true,
  displayGradient: true,
  displayTriangle: true,
  transparentBackground: false,
  animate: false,
  recordingMode: false,
  backgroundName: null,
  script: "",
  scriptPlaying: false,
};

type Listener = () => void;

export class ScenarioStore {
  private state: ScenarioState = initialState;
  private listeners = new Set<Listener>();

  getState = (): ScenarioState => {
    return this.state;
  };

  set = (
    partial:
      | Partial<ScenarioState>
      | ((state: ScenarioState) => Partial<ScenarioState>),
  ): void => {
    const patch = typeof partial === "function" ? partial(this.state) : partial;
    this.state = { ...this.state, ...patch };

    for (const listener of this.listeners) {
      listener();
    }
  };

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}

export const scenarioStore = new ScenarioStore();

/**
 * Subscribes a React component to the scenario store. The selector must
 * return a referentially stable value (a single field or the whole state
 * object). Do not return object literals built inside the selector.
 */
export function useScenarioStore<T>(selector: (state: ScenarioState) => T): T {
  return useSyncExternalStore(
    scenarioStore.subscribe,
    () => selector(scenarioStore.getState()),
    () => selector(scenarioStore.getState()),
  );
}

export function selectBackground(state: ScenarioState): string | null {
  switch (state.backgroundMode) {
    case "image":
      return state.backgroundImage;
    case "url":
      return state.backgroundUrl;
  }
}
