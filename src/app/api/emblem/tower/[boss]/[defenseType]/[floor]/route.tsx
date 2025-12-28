import { TowerEmblem } from "@/app/api/emblem/_components/tower-emblem";
import { TOWER_EMBLEM_BOSSES, TOWER_EMBLEM_DEFENSE_TYPES } from "@/lib/emblems";
import {
  DEFAULT_SIZES,
  makeEmblem,
  processTrailingPart,
} from "@/lib/emblems.server";
import { NextResponse } from "next/server";

type RouteParams = {
  boss: string;
  defenseType: string;
  floor: string;
};

export async function generateStaticParams(): Promise<RouteParams[]> {
  const combinations: RouteParams[] = [];

  for (const boss of TOWER_EMBLEM_BOSSES) {
    for (const defenseType of TOWER_EMBLEM_DEFENSE_TYPES) {
      for (const name of [boss.id, boss.name]) {
        for (const floor of [50, 100]) {
          combinations.push({
            boss: name,
            defenseType: defenseType,
            floor: floor.toString(),
          });

          combinations.push({
            boss: name,
            defenseType: defenseType,
            floor: `${floor}.png`,
          });

          for (const size of DEFAULT_SIZES) {
            combinations.push({
              boss: name,
              defenseType: defenseType,
              floor: `${floor}.png@w${size}`,
            });
          }
        }
      }
    }
  }

  return combinations;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<RouteParams> },
) {
  const {
    boss: rawBoss,
    defenseType: rawDefenseType,
    floor: rawFloor,
  } = await params;

  const boss = TOWER_EMBLEM_BOSSES.find(
    (b) => b.id === rawBoss || b.name === rawBoss.toLowerCase(),
  );

  if (!boss) {
    return NextResponse.json(
      {
        error: "Boss not found.",
      },
      {
        status: 404,
      },
    );
  }

  const defenseType = TOWER_EMBLEM_DEFENSE_TYPES.find(
    (dt) => dt.toLowerCase() === rawDefenseType.toLowerCase(),
  );

  if (!defenseType) {
    return NextResponse.json(
      {
        error: "Invalid defense type.",
      },
      {
        status: 400,
      },
    );
  }

  const {
    content: rawFloorWithoutPng,
    isPng: png,
    width,
  } = processTrailingPart(rawFloor);

  const numberParsedFloor = Number.parseInt(rawFloorWithoutPng, 10);
  if (Number.isNaN(numberParsedFloor) || numberParsedFloor < 1) {
    return NextResponse.json(
      {
        error: "Invalid floor",
      },
      {
        status: 400,
      },
    );
  }

  const floor = Math.floor(numberParsedFloor / 50) * 50;

  const output = await makeEmblem(
    <TowerEmblem boss={boss} defenseType={defenseType} floor={floor} />,
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
