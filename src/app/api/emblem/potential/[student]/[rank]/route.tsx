import { PotentialEmblem } from "@/app/api/emblem/_components/potential-emblem";
import { db } from "@/lib/db";
import type { PotentialEmblemRank } from "@/lib/emblems";
import { makeEmblem } from "@/lib/emblems.server";
import { NextResponse } from "next/server";

type RouteParams = {
  student: string;
  rank: string;
};

export async function generateStaticParams(): Promise<RouteParams[]> {
  const students = await db.student.findMany();
  const ranks: PotentialEmblemRank[] = [25, 50];

  const combinations: RouteParams[] = [];

  for (const student of students) {
    for (const rank of ranks) {
      combinations.push({ student: student.devName, rank: rank.toString() });
      combinations.push({ student: student.devName, rank: `${rank}.png` });
      combinations.push({ student: student.id, rank: rank.toString() });
      combinations.push({ student: student.id, rank: `${rank}.png` });
      combinations.push({
        student: student.schaleDbId.toString(),
        rank: rank.toString(),
      });
      combinations.push({
        student: student.schaleDbId.toString(),
        rank: `${rank}.png`,
      });
    }
  }

  for (const rank of ranks) {
    combinations.push({ student: "hoshino_battle", rank: rank.toString() });
    combinations.push({ student: "hoshino_battle", rank: `${rank}.png` });
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
  const { student: rawStudent, rank: rawRank } = await params;
  const nameOverride = new URL(req.url).searchParams.get("name") ?? undefined;

  const numberParsedStudent = Number.parseInt(rawStudent, 10);

  let finalRawStudent = rawStudent;

  if (finalRawStudent === "hoshino_battle") {
    finalRawStudent = "hoshino_battle_tank";
  }

  const student = await db.student.findFirst({
    where: {
      OR: [
        {
          devName: finalRawStudent,
        },
        {
          id: finalRawStudent,
        },
        ...(Number.isNaN(numberParsedStudent)
          ? []
          : [
              {
                schaleDbId: numberParsedStudent,
              },
            ]),
      ],
    },
  });

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

  const png = rawRank.endsWith(".png");

  const rawRankWithoutPng = rawRank.endsWith(".png")
    ? rawRank.slice(0, -4)
    : rawRank;

  const rank = Number.parseInt(rawRankWithoutPng, 10) as PotentialEmblemRank;

  if (![25, 50].includes(rank)) {
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
