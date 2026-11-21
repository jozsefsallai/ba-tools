import "server-only";

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import {
  type BoardImages,
  MissionBoardSvg,
} from "@/app/[locale]/missions/_components/mission-board";
import {
  attackTypeStyle,
  teamBattles,
  teamDamageTypes,
} from "@/app/[locale]/missions/_lib/team-damage";
import bossIcon from "@/assets/images/missions/Common_Icon_Enemy_Champion.png?og-asset";
import enemyIcon from "@/assets/images/missions/Common_Icon_Enemy_Elite.png?og-asset";
import type { MissionMapData } from "@/lib/game-data/contract";
import { initialBoard } from "@/lib/missions/initial-board";
import type { MissionSolutions } from "@/lib/missions/solver";
import { fetchOgArtwork } from "@/lib/og/artwork.server";
import { svgMarkup } from "@/lib/og/svg-markup.server";
import { buildGameItemIconUrl } from "@/lib/url";
import notoSansSemibold from "~fonts/noto-sans/NotoSans-SemiBold.ttf?og-asset";

const CSS_VARIABLES: Record<string, string> = {
  "--color-type-red": "#930008",
  "--color-type-yellow": "#bf8901",
  "--color-type-blue": "#226f9c",
  "--color-type-purple": "#794394",
  "--color-type-green": "#11736b",
};

let fontFile: Promise<string> | undefined;

// resvg only reads fonts from files, and the board's numbers need one
function boardFont() {
  fontFile ??= (async () => {
    const path = join(
      await mkdtemp(join(tmpdir(), "mission-board-")),
      "NotoSans-SemiBold.ttf",
    );

    await writeFile(
      path,
      Buffer.from(
        notoSansSemibold.slice(notoSansSemibold.indexOf(",") + 1),
        "base64",
      ),
    );

    return path;
  })();

  return fontFile;
}

const resolveCssVariables = (value: string) =>
  value.replace(
    /var\((--[\w-]+)\)/g,
    (match, name: string) => CSS_VARIABLES[name] ?? match,
  );

export const MISSION_BOARD_SIZE = {
  width: 760,
  height: 458,
};

export async function missionBoardImage({
  map,
  solutions,
}: {
  map: MissionMapData;
  solutions: MissionSolutions;
}) {
  const images: BoardImages = {
    boss: bossIcon,
    enemy: enemyIcon,
    gem:
      (await fetchOgArtwork(buildGameItemIconUrl("Currency_Icon_Gem"))) ?? "",
  };

  const route = solutions.fastest ?? solutions.withBox ?? solutions.allStars;
  const damages = route ? teamDamageTypes(teamBattles(map, route)) : [];

  const svg = svgMarkup(
    <MissionBoardSvg
      id="og"
      map={map}
      snapshot={route?.steps[0]?.start ?? initialBoard(map, solutions)}
      teamColors={(route?.deploy ?? []).map(
        (_, echelon) => attackTypeStyle(damages[echelon] ?? null).fill,
      )}
      deployment
      labels={{
        title: "",
        boss: "",
        enemy: "",
        armor: {},
      }}
      images={images}
      still
    />,
  );

  const font = {
    loadSystemFonts: false,
    fontFiles: [
      await boardFont(),
    ],
    defaultFontFamily: "Noto Sans",
  };

  const markup = resolveCssVariables(svg);

  const size = new Resvg(markup, {
    font,
  });

  const scale = Math.min(
    MISSION_BOARD_SIZE.width / size.width,
    MISSION_BOARD_SIZE.height / size.height,
  );

  const png = new Resvg(markup, {
    font,
    fitTo: {
      mode: "width",
      value: Math.round(size.width * scale * 2),
    },
  })
    .render()
    .asPng();

  return {
    png,
    width: Math.round(size.width * scale),
    height: Math.round(size.height * scale),
  };
}
