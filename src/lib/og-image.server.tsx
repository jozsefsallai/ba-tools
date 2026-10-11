import "server-only";

import { Resvg } from "@resvg/resvg-js";
import type { ReactNode } from "react";
import type { Font } from "satori";
import satori from "satori";

import nexonData from "@/app/_fonts/nexon-football-gothic/NEXON-Football-Gothic-B.otf?og-asset";
import notoSansData from "~fonts/noto-sans/NotoSans-Regular.ttf?og-asset";
import notoSansSemiboldData from "~fonts/noto-sans/NotoSans-SemiBold.ttf?og-asset";
import japaneseData from "~fonts/shinmgoupr/U-OTF-ShinMGoUpr-Medium.otf?og-asset";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

function fontBytes(dataUrl: string) {
  return Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
}

const notoSansFonts: Font[] = [
  {
    name: "Noto Sans",
    data: fontBytes(notoSansData),
    weight: 400,
    style: "normal",
  },
  {
    name: "Noto Sans",
    data: fontBytes(notoSansSemiboldData),
    weight: 600,
    style: "normal",
  },
];

export async function loadNotoSansFonts(): Promise<Font[]> {
  return notoSansFonts;
}

let ogFonts: Font[] | undefined;
export async function loadOgImageFonts(): Promise<Font[]> {
  if (!ogFonts) {
    const nexon = fontBytes(nexonData);

    const japanese = fontBytes(japaneseData);
    ogFonts = [
      ...notoSansFonts,
      {
        name: "Nexon Football Gothic",
        data: nexon,
        weight: 700,
        style: "normal",
      },
      {
        name: "Nexon Football Gothic",
        data: nexon,
        weight: 700,
        style: "italic",
      },
      { name: "Japanese", data: japanese, weight: 400, style: "normal" },
      { name: "Japanese", data: japanese, weight: 700, style: "normal" },
    ];
  }

  return ogFonts;
}

function generatePng(svgData: string, width: number) {
  const resvg = new Resvg(svgData, {
    fitTo: {
      mode: "width",
      value: width,
    },
  });

  return resvg.render().asPng();
}

export async function makeOgImage(children: ReactNode) {
  const fonts = await loadOgImageFonts();

  const svg = await satori(children, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts,
  });

  return generatePng(svg, OG_WIDTH);
}
