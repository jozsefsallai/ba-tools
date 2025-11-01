import { EMBLEM_HEIGHT, EMBLEM_WIDTH } from "@/lib/emblems";
import { buildCDNAbsoluteUrl } from "@/lib/url";
import { Resvg } from "@resvg/resvg-js";
import type { ReactNode } from "react";
import satori from "satori";

function generatePNG(svgData: string) {
  const resvg = new Resvg(svgData, {
    fitTo: {
      mode: "width",
      value: EMBLEM_WIDTH,
    },
  });

  return resvg.render().asPng();
}

export async function makeEmblem(children: ReactNode, png = false) {
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

  return generatePNG(svg);
}
