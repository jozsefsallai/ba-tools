import { BossEmblem } from "@/app/api/emblem/_components/boss-emblem";
import {
  BOSS_EMBLEM_RARITIES,
  VALID_BOSS_EMBLEM_COMBINATIONS,
} from "@/lib/emblems";
import {
  DEFAULT_SIZES,
  makeEmblem,
  processTrailingPart,
} from "@/lib/emblems.server";
import { NextResponse } from "next/server";

type RouteParams = {
  name: string;
  terrain: string;
  rarity: string;
};

export async function generateStaticParams(): Promise<RouteParams[]> {
  const combinations: RouteParams[] = [];

  for (const combo of VALID_BOSS_EMBLEM_COMBINATIONS) {
    for (const rarity of BOSS_EMBLEM_RARITIES) {
      combinations.push({
        name: combo.name,
        terrain: combo.terrain,
        rarity: rarity.id,
      });

      combinations.push({
        name: combo.name,
        terrain: combo.terrain,
        rarity: `${rarity.id}.png`,
      });

      for (const size of DEFAULT_SIZES) {
        combinations.push({
          name: combo.name,
          terrain: combo.terrain,
          rarity: `${rarity.id}.png@w${size}`,
        });
      }
    }
  }

  return combinations;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<RouteParams> },
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

  return new Response(
    typeof output === "string" ? output : (output.buffer as ArrayBuffer),
    {
      headers: {
        "Content-Type": png ? "image/png" : "image/svg+xml",
      },
    },
  );
}
