import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import type { ReactNode } from "react";
import type { Font } from "satori";
import satori from "satori";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

let notoSansFontsPromise: Promise<Font[]> | undefined;

export function loadNotoSansFonts(): Promise<Font[]> {
  if (!notoSansFontsPromise) {
    notoSansFontsPromise = (async () => {
      const notoSans = fs.readFileSync(
        path.join(
          process.cwd(),
          "public/assets/fonts/noto-sans/NotoSans-Regular.ttf",
        ),
      );

      const notoSansSemibold = fs.readFileSync(
        path.join(
          process.cwd(),
          "public/assets/fonts/noto-sans/NotoSans-SemiBold.ttf",
        ),
      );

      return [
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
      ];
    })();
  }

  return notoSansFontsPromise.catch((error) => {
    notoSansFontsPromise = undefined;
    throw error;
  });
}

let ogFontsPromise: Promise<Font[]> | undefined;

async function readOgImageFonts(): Promise<Font[]> {
  const fonts = [...(await loadNotoSansFonts())];

  const nexonPath = path.join(
    process.cwd(),
    "src/app/_fonts/nexon-football-gothic/NEXON-Football-Gothic-B.otf",
  );
  const nexon = fs.readFileSync(nexonPath);

  fonts.push({
    name: "Nexon Football Gothic",
    data: nexon,
    weight: 700,
    style: "normal",
  });

  fonts.push({
    name: "Nexon Football Gothic",
    data: nexon,
    weight: 700,
    style: "italic",
  });

  fonts.push({
    name: "Japanese",
    data: fs.readFileSync(
      path.join(
        process.cwd(),
        "public/assets/fonts/shinmgoupr/U-OTF-ShinMGoUpr-Medium.otf",
      ),
    ),
    weight: 400,
    style: "normal",
  });

  fonts.push({ ...fonts[fonts.length - 1], weight: 700 });

  return fonts;
}

export function loadOgImageFonts(): Promise<Font[]> {
  ogFontsPromise ??= readOgImageFonts();

  return ogFontsPromise.catch((error) => {
    ogFontsPromise = undefined;
    throw error;
  });
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
