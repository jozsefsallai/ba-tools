import {
  type ScenarioRenderer,
  getActiveScenarioRenderer,
} from "@/app/[locale]/scenario-image-generator/_lib/renderer/scenario-renderer";
import type {
  ScenarioScriptCommand,
  ScenarioScriptEvent,
} from "@/app/[locale]/scenario-image-generator/_lib/script/parser";
import { scenarioStore } from "@/app/[locale]/scenario-image-generator/_lib/store";
import type { ScenarioCharacterData } from "@/app/[locale]/scenario-image-generator/_lib/types";
import { Assets } from "pixi.js";

export class ScenarioScriptPlayer {
  private runId = 0;

  async play(events: ScenarioScriptEvent[]): Promise<void> {
    const renderer = getActiveScenarioRenderer();
    if (!renderer) {
      return;
    }

    this.stop();

    const runId = ++this.runId;
    const isCancelled = () => this.runId !== runId;

    scenarioStore.set({
      scriptPlaying: true,
      animate: true,
      name: "",
      affiliation: "",
      content: "",
      characters: [],
      displayButtons: true,
      displayLine: true,
      displayGradient: true,
      displayTriangle: true,
    });

    try {
      for (const event of events) {
        for (const command of event.commands) {
          if (isCancelled()) {
            return;
          }

          await this.execute(command, renderer, isCancelled);
        }
      }
    } finally {
      if (!isCancelled()) {
        scenarioStore.set({ animate: false, scriptPlaying: false });
      }
    }
  }

  stop(): void {
    this.runId++;

    const renderer = getActiveScenarioRenderer();
    if (renderer) {
      renderer.cancelWaits();
      renderer.cancelTweens(true);
      renderer.setOverlayAlpha(0);
    }

    if (scenarioStore.getState().scriptPlaying) {
      scenarioStore.set({ animate: false, scriptPlaying: false });
    }
  }

  private updateCharacter(
    id: string,
    updater: (character: ScenarioCharacterData) => ScenarioCharacterData,
  ): void {
    scenarioStore.set((state) => ({
      characters: state.characters.map((character) =>
        character.id === id ? updater(character) : character,
      ),
    }));
  }

  private findCharacterIndex(id: string): number {
    return scenarioStore
      .getState()
      .characters.findIndex((character) => character.id === id);
  }

  /**
   * Blocks until the dialogue text finishes its typewriter animation.
   * Clicking the canvas while the text is typing reveals it instantly.
   */
  private async waitForDialogueToRender(
    renderer: ScenarioRenderer,
    isCancelled: () => boolean,
  ): Promise<void> {
    while (!renderer.isDialogueComplete()) {
      const result = await renderer.waitForClickOrDialogueComplete();

      if (isCancelled()) {
        return;
      }

      if (result === "click") {
        renderer.completeDialogue();
      }
    }
  }

  private async execute(
    command: ScenarioScriptCommand,
    renderer: ScenarioRenderer,
    isCancelled: () => boolean,
  ): Promise<void> {
    switch (command.type) {
      case "CHARA_CREATE": {
        scenarioStore.set((state) => ({
          characters: [
            ...state.characters,
            {
              id: command.id,
              spriteUrl: "",
              filename: "",
              timestamp: Date.now(),
              // park new characters offscreen until a CHARA_SET places them
              x: 9999,
              y: 0,
              scale: 1,
              expressions: {},
            },
          ],
        }));
        break;
      }

      case "CHARA_SPRITE": {
        // warm the texture cache so CHARA_EXPR swaps are instant
        Assets.load(command.url).catch(() => {});

        this.updateCharacter(command.id, (character) => ({
          ...character,
          spriteUrl: command.url,
          expressions: {
            ...character.expressions,
            [command.expression]: command.url,
          },
        }));
        break;
      }

      case "FADE_IN": {
        await renderer.fadeOverlayTo(1, 0, command.time);
        break;
      }

      case "FADE_OUT": {
        await renderer.fadeOverlayTo(0, 1, command.time);
        break;
      }

      case "CHARA_SET": {
        this.updateCharacter(command.id, (character) => ({
          ...character,
          x: command.x ?? character.x,
          y: command.y ?? character.y,
          scale: command.scale ?? character.scale,
          darken: command.darken ?? character.darken,
          hologram: command.hologram ?? character.hologram,
        }));
        break;
      }

      case "CHARA_FADE_IN": {
        const index = this.findCharacterIndex(command.id);
        if (index < 0) {
          break;
        }

        renderer.setCharacterAlpha(index, 0);
        await renderer.fadeCharacter(index, 0, 1, command.time);
        break;
      }

      case "WAIT": {
        await renderer.wait(command.time);
        break;
      }

      case "NAME": {
        scenarioStore.set({ name: command.name });
        break;
      }

      case "AFFILIATION": {
        scenarioStore.set({ affiliation: command.affiliation });
        break;
      }

      case "CLEAR_NAME": {
        scenarioStore.set({ name: "" });
        break;
      }

      case "CLEAR_AFFILIATION": {
        scenarioStore.set({ affiliation: "" });
        break;
      }

      case "CHARA_EXPR": {
        const character = scenarioStore
          .getState()
          .characters.find((c) => c.id === command.id);
        const url = character?.expressions?.[command.expression];

        if (url) {
          this.updateCharacter(command.id, (c) => ({ ...c, spriteUrl: url }));
        }
        break;
      }

      case "CHARA_MOVE": {
        const index = this.findCharacterIndex(command.id);
        if (index < 0) {
          break;
        }

        const character = scenarioStore.getState().characters[index];
        const fromX = character.x;
        const fromY = character.y;
        const toX = command.x ?? fromX;
        const toY = command.y ?? fromY;

        this.updateCharacter(command.id, (c) => ({ ...c, x: toX, y: toY }));

        if (command.time && command.time > 0) {
          await renderer.moveCharacter(
            index,
            fromX,
            fromY,
            toX,
            toY,
            command.time,
          );
        }
        break;
      }

      case "INPUT": {
        // The text is normally already rendered (MESSAGE blocks), but guard
        // anyway, then wait for a click to advance.
        await this.waitForDialogueToRender(renderer, isCancelled);

        if (isCancelled()) {
          return;
        }

        await renderer.waitForClick();
        break;
      }

      case "MESSAGE": {
        scenarioStore.set({ content: command.message });

        // Block until the typewriter finishes so the script respects the
        // scroll speed setting even without a following INPUT.
        await this.waitForDialogueToRender(renderer, isCancelled);
        break;
      }

      case "CLEAR_MESSAGE": {
        scenarioStore.set({ content: "" });
        break;
      }
    }
  }
}

export const scenarioScriptPlayer = new ScenarioScriptPlayer();
