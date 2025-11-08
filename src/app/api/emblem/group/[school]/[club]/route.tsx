import { GroupEmblem } from "@/app/api/emblem/_components/group-emblem";
import {
  GROUP_EMBLEM_CLUBS,
  GROUP_EMBLEM_SCHOOLS,
  GROUP_EMBLEM_VALID_COMBINATIONS,
} from "@/lib/emblems";
import {
  DEFAULT_SIZES,
  makeEmblem,
  processTrailingPart,
} from "@/lib/emblems.server";
import { NextResponse } from "next/server";

type RouteParams = {
  school: string;
  club: string;
};

export async function generateStaticParams(): Promise<RouteParams[]> {
  const combinations: RouteParams[] = [];

  for (const combo of GROUP_EMBLEM_VALID_COMBINATIONS) {
    combinations.push({
      school: combo.school,
      club: combo.club,
    });

    combinations.push({
      school: combo.school,
      club: `${combo.club}.png`,
    });

    for (const size of DEFAULT_SIZES) {
      combinations.push({
        school: combo.school,
        club: `${combo.club}.png@w${size}`,
      });
    }
  }

  return combinations;
}

export async function GET(
  req: Request,
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

  return new Response(
    typeof output === "string" ? output : (output.buffer as ArrayBuffer),
    {
      headers: {
        "Content-Type": png ? "image/png" : "image/svg+xml",
      },
    },
  );
}
