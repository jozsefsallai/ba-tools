"use client";

import {
  SCENARIO_LINE_WIDTH,
  SCENARIO_TEXT_SCROLL_SPEED,
  SCENARIO_VIEW_WIDTH,
} from "@/app/scenario-image-generator/_lib/constants";
import { useTick } from "@pixi/react";
import { CanvasTextMetrics, TextStyle } from "pixi.js";
import { useEffect, useRef, useState } from "react";

export type ScenarioDialogueProps = {
  content: string;
  fontSize?: number;
  onTextRendered?: () => void;
  onTextFinishedRendering?: () => void;
  animate?: boolean;
  scrollSpeed?: number;
};

export function ScenarioDialogue({
  content,
  fontSize = 41,
  onTextRendered,
  onTextFinishedRendering,
  animate,
  scrollSpeed = SCENARIO_TEXT_SCROLL_SPEED,
}: ScenarioDialogueProps) {
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState("");
  const linesRef = useRef<string[]>([]);

  useEffect(() => {
    if (!animate) {
      return;
    }

    const style = new TextStyle({
      fontFamily: "Noto Sans",
      fontSize,
      wordWrap: true,
      wordWrapWidth: SCENARIO_LINE_WIDTH,
      letterSpacing: 0.4,
      lineHeight: 1.4 * fontSize,
    });

    const metrics = CanvasTextMetrics.measureText(content, style);
    linesRef.current = metrics.lines;
    setProgress(0);
    setText("");
  }, [content, fontSize, animate]);

  useTick({
    isEnabled: !!animate,
    callback: (tick) => {
      if (progress >= content.length) {
        onTextFinishedRendering?.();
        return;
      }

      onTextRendered?.();
      setProgress((prev) => {
        return Math.min(prev + tick.deltaTime * scrollSpeed, content.length);
      });
    },
  });

  useEffect(() => {
    if (!animate) {
      setText(content);
      return;
    }

    const charsToShow = Math.floor(progress);

    let shown = 0;
    let result = "";

    for (const line of linesRef.current) {
      if (shown >= charsToShow) {
        break;
      }

      const remaining = charsToShow - shown;

      if (line.length <= remaining) {
        result += `${line}\n`;
        shown += line.length;
      } else {
        result += line.slice(0, remaining);
        shown += remaining;
        break;
      }
    }

    setText(result);
  }, [progress, content, animate]);

  return (
    <pixiText
      text={text}
      x={(SCENARIO_VIEW_WIDTH - SCENARIO_LINE_WIDTH) / 2 + 4}
      y={861}
      style={{
        fontFamily: "Noto Sans",
        fontSize: fontSize,
        fill: "#ffffff",
        align: "left",
        letterSpacing: 0.4,
        lineHeight: 1.4 * fontSize,
        stroke: {
          width: 4,
          color: "#2b435b",
        },
        wordWrap: true,
        wordWrapWidth: SCENARIO_LINE_WIDTH,
      }}
    />
  );
}
