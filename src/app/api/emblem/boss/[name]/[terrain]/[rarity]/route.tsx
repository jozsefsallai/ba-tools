import { NextResponse } from "next/server";
import { BossEmblem } from "@/app/api/emblem/_components/boss-emblem";
import { createEmblemResponse } from "@/app/api/emblem/_lib/response";
import {
  BOSS_EMBLEM_RARITIES,
  VALID_BOSS_EMBLEM_COMBINATIONS,
} from "@/lib/emblems";
import { makeEmblem, processTrailingPart } from "@/lib/emblems.server";

type RouteParams = {
  name: string;
  terrain: string;
  rarity: string;
};

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<RouteParams>;
  },
) {
  const {
    name: rawName,
    terrain: rawTerrain,
    rarity: rawRarity,
  } = await params;

  const bossData = VALID_BOSS_EMBLEM_COMBINATIONS.find((combo) => {
    return (
      combo.name.toLowerCase() === rawName.toLowerCase() &&
      combo.terrain.toLowerCase() === rawTerrain.toLowerCase()
    );
  });

  if (!bossData) {
    return NextResponse.json(
      {
        error: "Invalid boss emblem.",
      },
      {
        status: 400,
      },
    );
  }

  const { content: rarity, isPng: png, width } = processTrailingPart(rawRarity);

  const rarityData = BOSS_EMBLEM_RARITIES.find(
    (r) => r.id.toLowerCase() === rarity.toLowerCase(),
  );

  if (!rarityData) {
    return NextResponse.json(
      {
        error: "Invalid boss emblem rarity.",
      },
      {
        status: 400,
      },
    );
  }

  const name = bossData.name;
  const terrain = bossData.terrain;

  const output = await makeEmblem(
    <BossEmblem name={name} terrain={terrain} rarity={rarityData.id} />,
    png,
    width,
  );

  return createEmblemResponse(output, png);
}
