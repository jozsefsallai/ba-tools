import fs from "node:fs";
import path from "node:path";
import { buildCDNAbsoluteUrl } from "@/lib/url";
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
      const notoSansPath = buildCDNAbsoluteUrl(
        "v2/fonts/noto-sans/NotoSans-Regular.ttf",
      );

      const notoSansSemiboldPath = buildCDNAbsoluteUrl(
        "v2/fonts/noto-sans/NotoSans-SemiBold.ttf",
      );

      const [notoSans, notoSansSemibold] = await Promise.all([
        fetch(notoSansPath).then((res) => res.arrayBuffer()),
        fetch(notoSansSemiboldPath).then((res) => res.arrayBuffer()),
      ]);

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

export async function loadOgImageFonts(): Promise<Font[]> {
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

  return fonts;
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
