import { EMBLEM_HEIGHT, EMBLEM_WIDTH } from "@/lib/emblems";
import { buildCDNAbsoluteUrl } from "@/lib/url";
import { Resvg } from "@resvg/resvg-js";
import type { ReactNode } from "react";
import satori from "satori";

export const DEFAULT_SIZES = [100, 140, 280, 420];

export function processTrailingPart(trailing: string) {
  const parts = trailing.split(".");

  if (parts.length === 1) {
    return {
      content: trailing,
      isPng: false,
      width: undefined,
    };
  }

  const extensionWithWidth = parts.slice(-1)[0];
  const content = parts.slice(0, -1).join(".");

  const extensionAndWidthParts = extensionWithWidth.split("@w");
  const isPng = extensionAndWidthParts[0] === "png";

  if (extensionAndWidthParts.length === 1) {
    return {
      content,
      isPng,
      width: undefined,
    };
  }

  const widthPart = extensionAndWidthParts[1];

  let width: number | undefined;

  const parsedWidth = Number.parseInt(widthPart, 10);

  if (!Number.isNaN(parsedWidth)) {
    width = Math.min(Math.max(64, parsedWidth), EMBLEM_WIDTH);
  }

  return {
    content,
    isPng,
    width,
  };
}

function generatePNG(svgData: string, width = EMBLEM_WIDTH) {
  const resvg = new Resvg(svgData, {
    fitTo: {
      mode: "width",
      value: width,
    },
  });

  return resvg.render().asPng();
}

export async function makeEmblem(
  children: ReactNode,
  png = false,
  width = EMBLEM_WIDTH,
) {
  const notoSansPath = buildCDNAbsoluteUrl(
    "v2/fonts/noto-sans/NotoSans-Regular.ttf",
  );

  const notoSansSemiboldPath = buildCDNAbsoluteUrl(
    "v2/fonts/noto-sans/NotoSans-SemiBold.ttf",
  );

  const notoSans = await fetch(notoSansPath).then((res) => res.arrayBuffer());
  const notoSansSemibold = await fetch(notoSansSemiboldPath).then((res) =>
    res.arrayBuffer(),
  );

  const svg = await satori(children, {
    width: EMBLEM_WIDTH,
    height: EMBLEM_HEIGHT,
    fonts: [
      {
        name: "Noto Sans",
        data: notoSans,
        weight: 400,
        style: "normal",
      },
      {
        name: "Noto Sans",
        data: notoSansSemibold,
        weight: 600,
        style: "normal",
      },
    ],
  });

  if (!png) {
    return svg;
  }

  return generatePNG(svg, width);
}
