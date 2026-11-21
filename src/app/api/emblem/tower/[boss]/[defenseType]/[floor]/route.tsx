import { NextResponse } from "next/server";
import { TowerEmblem } from "@/app/api/emblem/_components/tower-emblem";
import { createEmblemResponse } from "@/app/api/emblem/_lib/response";
import { TOWER_EMBLEM_BOSSES, TOWER_EMBLEM_DEFENSE_TYPES } from "@/lib/emblems";
import { makeEmblem, processTrailingPart } from "@/lib/emblems.server";

type RouteParams = {
  boss: string;
  defenseType: string;
  floor: string;
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

  return createEmblemResponse(output, png);
}
