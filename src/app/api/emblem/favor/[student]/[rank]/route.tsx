import { FavorEmblem } from "@/app/api/emblem/_components/favor-emblem";
import { db } from "@/lib/db";
import {
  FAVOR_EMBLEM_EXTRA_ARONA,
  FAVOR_EMBLEM_EXTRA_PLANA,
  type FavorEmblemExtra,
  type FavorEmblemRank,
} from "@/lib/emblems";
import { makeEmblem } from "@/lib/emblems.server";
import type { Student } from "@prisma/client";
import { NextResponse } from "next/server";

type RouteParams = {
  student: string;
  rank: string;
};

export async function generateStaticParams(): Promise<RouteParams[]> {
  const students = await db.student.findMany();
  const ranks: FavorEmblemRank[] = [20, 50, 100];

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

  for (const extraStudent of [
    FAVOR_EMBLEM_EXTRA_ARONA,
    FAVOR_EMBLEM_EXTRA_PLANA,
  ]) {
    for (const rank of ranks) {
      combinations.push({ student: extraStudent.id, rank: rank.toString() });
      combinations.push({ student: extraStudent.id, rank: `${rank}.png` });
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
  const { student: rawStudent, rank: rawRank } = await params;
  const nameOverride = new URL(req.url).searchParams.get("name") ?? undefined;

  const numberParsedStudent = Number.parseInt(rawStudent, 10);

  let finalRawStudent = rawStudent;

  if (finalRawStudent === "hoshino_battle") {
    finalRawStudent = "hoshino_battle_tank";
  }

  let student: Student | FavorEmblemExtra | null;

  if (finalRawStudent === "arona" || finalRawStudent === "Arona") {
    student = FAVOR_EMBLEM_EXTRA_ARONA;
  } else if (finalRawStudent === "plana" || finalRawStudent === "Plana") {
    student = FAVOR_EMBLEM_EXTRA_PLANA;
  } else {
    student = await db.student.findFirst({
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
  }

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

  const rank = Number.parseInt(rawRankWithoutPng, 10) as FavorEmblemRank;

  if (![20, 50, 100].includes(rank)) {
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
    <FavorEmblem rank={rank} student={student} nameOverride={nameOverride} />,
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
