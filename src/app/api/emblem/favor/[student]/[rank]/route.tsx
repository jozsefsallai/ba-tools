import { FavorEmblem } from "@/app/api/emblem/_components/favor-emblem";
import { createEmblemResponse } from "@/app/api/emblem/_lib/response";
import { db } from "@/lib/db";
import { getCachedEmblemStudent } from "@/lib/emblem-student.server";
import {
  FAVOR_EMBLEM_EXTRA_ARONA,
  FAVOR_EMBLEM_EXTRA_PLANA,
  type FavorEmblemExtra,
  type FavorEmblemRank,
} from "@/lib/emblems";
import {
  DEFAULT_SIZES,
  makeEmblem,
  processTrailingPart,
} from "@/lib/emblems.server";
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

      for (const size of DEFAULT_SIZES) {
        combinations.push({
          student: student.devName,
          rank: `${rank}.png@w${size}`,
        });
        combinations.push({
          student: student.id,
          rank: `${rank}.png@w${size}`,
        });
        combinations.push({
          student: student.schaleDbId.toString(),
          rank: `${rank}.png@w${size}`,
        });
      }
    }
  }

  for (const rank of ranks) {
    combinations.push({ student: "hoshino_battle", rank: rank.toString() });
    combinations.push({ student: "hoshino_battle", rank: `${rank}.png` });

    for (const size of DEFAULT_SIZES) {
      combinations.push({
        student: "hoshino_battle",
        rank: `${rank}.png@w${size}`,
      });
    }
  }

  for (const extraStudent of [
    FAVOR_EMBLEM_EXTRA_ARONA,
    FAVOR_EMBLEM_EXTRA_PLANA,
  ]) {
    for (const rank of ranks) {
      combinations.push({ student: extraStudent.id, rank: rank.toString() });
      combinations.push({ student: extraStudent.id, rank: `${rank}.png` });

      for (const size of DEFAULT_SIZES) {
        combinations.push({
          student: extraStudent.id,
          rank: `${rank}.png@w${size}`,
        });
      }
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

  const finalRawStudent = rawStudent;

  let student:
    | Awaited<ReturnType<typeof getCachedEmblemStudent>>
    | FavorEmblemExtra
    | null;

  if (finalRawStudent === "arona" || finalRawStudent === "Arona") {
    student = FAVOR_EMBLEM_EXTRA_ARONA;
  } else if (finalRawStudent === "plana" || finalRawStudent === "Plana") {
    student = FAVOR_EMBLEM_EXTRA_PLANA;
  } else {
    student = await getCachedEmblemStudent(finalRawStudent);
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

  const {
    content: rawRankWithoutPng,
    isPng: png,
    width,
  } = processTrailingPart(rawRank);

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
    width,
  );

  return createEmblemResponse(output, png);
}
