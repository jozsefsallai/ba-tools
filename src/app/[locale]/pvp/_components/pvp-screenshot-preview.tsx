"use client";

import type { PvpOcrReading, PvpPixelImage } from "@/lib/pvp";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

export function PvpCropPreview({ image }: { image: PvpPixelImage }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    canvas.width = image.width;
    canvas.height = image.height;

    const data = context.createImageData(image.width, image.height);
    data.data.set(image.pixels);

    context.putImageData(data, 0, 0);
  }, [image]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label="Screenshot crop"
      className="h-auto max-w-full self-start rounded border"
    />
  );
}

export function PvpOcrReadings({ readings }: { readings?: PvpOcrReading[] }) {
  const t = useTranslations("tools.pvp.reportImport");
  if (!readings || readings.length < 2) {
    return null;
  }

  return (
    <details className="text-xs">
      <summary className="cursor-pointer">{t("otherReadings")}</summary>

      <ul className="mt-2 flex flex-col gap-2">
        {readings.map((reading, index) => (
          <li key={index}>
            <pre className="whitespace-pre-wrap break-words">
              {reading.rawText || t("unreadable")}
            </pre>

            <span className="text-muted-foreground">
              {reading.confidence.toFixed(1)} · {reading.language} ·{" "}
              {reading.preprocessing}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
