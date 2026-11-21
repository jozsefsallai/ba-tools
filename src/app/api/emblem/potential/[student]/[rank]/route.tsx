import { NextResponse } from "next/server";
import { PotentialEmblem } from "@/app/api/emblem/_components/potential-emblem";
import { createEmblemResponse } from "@/app/api/emblem/_lib/response";
import { getCachedEmblemStudent } from "@/lib/emblem-student.server";
import type { PotentialEmblemRank } from "@/lib/emblems";
import { makeEmblem, processTrailingPart } from "@/lib/emblems.server";

type RouteParams = {
  student: string;
  rank: string;
};

export async function GET(
  req: Request,
  {
    params,
  }: {
    params: Promise<RouteParams>;
  },
) {
  const { student: rawStudent, rank: rawRank } = await params;
  const nameOverride = new URL(req.url).searchParams.get("name") ?? undefined;

  const student = await getCachedEmblemStudent(rawStudent);

  if (!student) {
    return NextResponse.json(
      {
        error: "Student not found.",
      },
      {
        status: 404,
      },
    );
  }

  const {
    content: rawRankWithoutPng,
    isPng: png,
    width,
  } = processTrailingPart(rawRank);

  const rank = Number.parseInt(rawRankWithoutPng, 10) as PotentialEmblemRank;

  if (
    ![
      25,
      50,
    ].includes(rank)
  ) {
    return NextResponse.json(
      {
        error: "Invalid favor emblem rank.",
      },
      {
        status: 400,
      },
    );
  }

  const output = await makeEmblem(
    <PotentialEmblem
      rank={rank}
      student={student}
      nameOverride={nameOverride}
    />,
    png,
    width,
  );

  return createEmblemResponse(output, png);
}
