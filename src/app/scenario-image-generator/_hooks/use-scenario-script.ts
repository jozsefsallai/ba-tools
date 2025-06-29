"use client";

import { useScenarioData } from "@/app/scenario-image-generator/_hooks/use-scenario-data";
import { useTick } from "@pixi/react";
import { useEffect, useMemo, useRef, useState } from "react";

export type FHScenaioEvent = {
  id: string;
  queue: Array<() => void>;
};

export function useScenarioScript(script: string) {
  const {
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
  } = useScenarioData();

  const [waitForTime, setWaitForTime] = useState(false);
  const [waitForInput, setWaitForInput] = useState(false);

  function resetApplication() {
    setName("");
    setAffiliation("");
    setContent("");
    setCharacters([]);
    setDisplayButtons(true);
    setDisplayLine(true);
    setDisplayGradient(true);
    setDisplayTriangle(true);
  }

  function cmdCharaCreate(id: string) {
    console.log("CHARA_CREATE", id);

    setCharacters((prev) => [
      ...prev,
      {
        id,
        spriteUrl: "",
        filename: "",
        x: 9999,
        y: 0,
        scale: 1,
        timestamp: Date.now(),
      },
    ]);
  }

  function cmdCharaSprite(id: string, _expression: string, url: string) {
    console.log("CHARA_SPRITE", id, _expression, url);

    setCharacters((prev) =>
      prev.map((chara) =>
        chara.id === id ? { ...chara, spriteUrl: url, filename: url } : chara,
      ),
    );
  }

  function cmdFadeIn(time?: number) {
    console.log("FADE_IN", time);

    // TODO: implement
  }

  function cmdCharaSet(
    id: string,
    {
      x,
      y,
      scale,
      darken,
      hologram,
    }: {
      x?: number;
      y?: number;
      scale?: number;
      darken?: boolean;
      hologram?: boolean;
    },
  ) {
    console.log("CHARA_SET", id, { x, y, scale, darken, hologram });

    setCharacters((prev) =>
      prev.map((chara) =>
        chara.id === id
          ? {
              ...chara,
              x: x ?? chara.x,
              y: y ?? chara.y,
              scale: scale ?? chara.scale,
              darken: darken ?? chara.darken,
              hologram: hologram ?? chara.hologram,
            }
          : chara,
      ),
    );
  }

  function cmdCharaFadeIn(id: string, time?: number) {
    console.log("CHARA_FADE_IN", id, time);

    // TODO: implement
  }

  function cmdWait(time: number) {
    console.log("WAIT", time);

    setWaitForTime(true);
    setTimeout(() => {
      setWaitForTime(false);
    }, time);
  }

  function cmdName(newName: string) {
    console.log("NAME", newName);

    setName(newName);
  }

  function cmdAffiliation(newAffiliation: string) {
    console.log("AFFILIATION", newAffiliation);

    setAffiliation(newAffiliation);
  }

  function cmdClearName() {
    console.log("CLEAR_NAME");
    setName("");
  }

  function cmdClearAffiliation() {
    console.log("CLEAR_AFFILIATION");
    setAffiliation("");
  }

  function cmdCharaExpr(id: string, expression: string) {
    console.log("CHARA_EXPR", id, expression);

    // TODO: implement
  }

  function cmdCharaMove(id: string, x?: number, y?: number, time?: number) {
    console.log("CHARA_MOVE", id, { x, y, time });

    setCharacters((prev) =>
      prev.map((chara) =>
        chara.id === id
          ? { ...chara, x: x ?? chara.x, y: y ?? chara.y }
          : chara,
      ),
    );
  }

  function cmdInput() {
    console.log("INPUT");

    setWaitForInput(true);
  }

  function cmdMessage(message: string) {
    console.log("MESSAGE", message);

    setContent(message);
  }

  function cmdClearMessage() {
    console.log("CLEAR_MESSAGE");

    setContent("");
  }

  const events = useMemo(() => {
    const result: FHScenaioEvent[] = [];

    let current: FHScenaioEvent | null = null;

    const lines = script.split("\n");

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (!trimmedLine) {
        if (current) {
          result.push(current);
          current = null;
        }

        continue;
      }

      if (trimmedLine.startsWith("#")) {
        if (current) {
          result.push(current);
        }

        current = {
          id: trimmedLine.slice(1).trim(),
          queue: [],
        };

        continue;
      }

      if (!current) {
        throw new Error("No event to attach command to.");
      }

      const parts = trimmedLine.split(" ");
      const rawCommand = parts[0];

      switch (rawCommand) {
        case "CHARA_CREATE": {
          const id = parts[1];

          if (!id) {
            throw new Error("CHARA_CREATE command requires an ID.");
          }

          current.queue.push(() => cmdCharaCreate(id));
          break;
        }

        case "CHARA_SPRITE": {
          const id = parts[1];
          const expression = parts[2];
          const url = parts.slice(3).join(" ");

          if (!id || !url) {
            throw new Error("CHARA_SPRITE command requires an ID and a URL.");
          }

          current.queue.push(() => cmdCharaSprite(id, expression, url));
          break;
        }

        case "FADE_IN": {
          const time = parts[1] ? Number.parseInt(parts[1], 10) : 1000;
          current.queue.push(() => cmdFadeIn(time));
          break;
        }

        case "CHARA_SET": {
          const id = parts[1];

          let x: number | undefined;
          let y: number | undefined;
          let scale: number | undefined;
          let darken: boolean | undefined;
          let hologram: boolean | undefined;

          if (!id) {
            throw new Error("CHARA_SET command requires an ID.");
          }

          for (let i = 2; i < parts.length; i++) {
            const part = parts[i];
            if (part.startsWith("x:")) {
              x = Number.parseFloat(part.slice(2));
            } else if (part.startsWith("y:")) {
              y = Number.parseFloat(part.slice(2));
            } else if (part.startsWith("scale:")) {
              scale = Number.parseFloat(part.slice(6));
            } else if (part.startsWith("darken:")) {
              darken = part === "darken:true" || part === "darken:1";
            } else if (part.startsWith("hologram:")) {
              hologram = part === "hologram:true" || part === "hologram:1";
            }
          }

          current.queue.push(() =>
            cmdCharaSet(id, { x, y, scale, darken, hologram }),
          );
          break;
        }

        case "CHARA_FADE_IN": {
          const id = parts[1];
          const time = parts[2] ? Number.parseInt(parts[2], 10) : 1000;

          if (!id) {
            throw new Error("CHARA_FADE_IN command requires an ID.");
          }

          current.queue.push(() => cmdCharaFadeIn(id, time));
          break;
        }

        case "WAIT": {
          const time = Number.parseInt(parts[1], 10);

          if (Number.isNaN(time)) {
            throw new Error(
              "WAIT command requires a valid time in milliseconds.",
            );
          }

          current.queue.push(() => cmdWait(time));
          break;
        }

        case "NAME": {
          const newName = parts.slice(1).join(" ");

          if (!newName) {
            throw new Error("NAME command requires a name.");
          }

          current.queue.push(() => cmdName(newName));
          break;
        }

        case "AFFILIATION": {
          const newAffiliation = parts.slice(1).join(" ");

          if (!newAffiliation) {
            throw new Error("AFFILIATION command requires an affiliation.");
          }

          current.queue.push(() => cmdAffiliation(newAffiliation));
          break;
        }

        case "CLEAR_NAME": {
          current.queue.push(() => cmdClearName());
          break;
        }

        case "CLEAR_AFFILIATION": {
          current.queue.push(() => cmdClearAffiliation());
          break;
        }

        case "CHARA_EXPR": {
          const id = parts[1];
          const expression = parts.slice(2).join(" ");

          if (!id || !expression) {
            throw new Error(
              "CHARA_EXPR command requires an ID and an expression.",
            );
          }

          current.queue.push(() => cmdCharaExpr(id, expression));
          break;
        }

        case "CHARA_MOVE": {
          const id = parts[1];

          let x: number | undefined;
          let y: number | undefined;
          let time: number | undefined;

          if (!id) {
            throw new Error("CHARA_MOVE command requires an ID.");
          }

          for (let i = 2; i < parts.length; i++) {
            const part = parts[i];
            if (part.startsWith("x:")) {
              x = Number.parseFloat(part.slice(2));
            } else if (part.startsWith("y:")) {
              y = Number.parseFloat(part.slice(2));
            } else if (part.startsWith("time:")) {
              time = Number.parseInt(part.slice(5), 10);
            }
          }

          current.queue.push(() => cmdCharaMove(id, x, y, time));
          break;
        }

        case "INPUT": {
          current.queue.push(() => cmdInput());
          break;
        }

        case "CLEAR_MESSAGE": {
          current.queue.push(() => cmdClearMessage());
          break;
        }

        default: {
          const message = parts.join(" ");
          current.queue.push(() => cmdMessage(message));
          break;
        }
      }
    }

    if (current) {
      result.push(current);
    }

    return result;
  }, [script]);

  const indexRef = useRef<number>(0);
  const currentQueue = useMemo(() => {
    if (indexRef.current >= events.length) {
      return [];
    }

    return events[indexRef.current]?.queue.slice() || [];
  }, [events, indexRef.current]);

  useTick(() => {
    if (
      !animate ||
      waitForTime ||
      waitForInput ||
      indexRef.current >= events.length
    ) {
      return;
    }

    if (currentQueue.length === 0) {
      indexRef.current++;
      return;
    }

    const command = currentQueue.shift();

    if (command) {
      command();
    }

    if (currentQueue.length === 0) {
      indexRef.current++;
    }
  });

  function handleInput() {
    if (!waitForInput) {
      return;
    }

    setWaitForInput(false);
  }

  useEffect(() => {
    if (animate) {
      resetApplication();
    }

    indexRef.current = 0;
    setWaitForTime(false);
    setWaitForInput(false);
  }, [animate]);

  return {
    handleInput,
  };
}
