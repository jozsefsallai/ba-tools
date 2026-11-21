import { NextResponse } from "next/server";
import { GroupEmblem } from "@/app/api/emblem/_components/group-emblem";
import { createEmblemResponse } from "@/app/api/emblem/_lib/response";
import { GROUP_EMBLEM_CLUBS, GROUP_EMBLEM_SCHOOLS } from "@/lib/emblems";
import { makeEmblem, processTrailingPart } from "@/lib/emblems.server";

type RouteParams = {
  school: string;
  club: string;
};

export async function GET(
  _req: Request,
  {
    params,
  }: {
    params: Promise<RouteParams>;
  },
) {
  const { school: rawSchool, club: rawClub } = await params;

  const school = GROUP_EMBLEM_SCHOOLS.find((s) => s.id === rawSchool);

  if (!school) {
    return NextResponse.json(
      {
        error: "School not found.",
      },
      {
        status: 404,
      },
    );
  }

  const {
    content: clubWithoutPng,
    isPng: png,
    width,
  } = processTrailingPart(rawClub);

  const club = GROUP_EMBLEM_CLUBS.find((c) => c.id === clubWithoutPng);

  const output = await makeEmblem(
    <GroupEmblem
      school={school.id}
      club={club?.id}
      nameOverride={club ? undefined : clubWithoutPng}
    />,
    png,
    width,
  );

  return createEmblemResponse(output, png);
}
