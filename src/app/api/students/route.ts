import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const students = await db.student.findMany({
    orderBy: {
      defaultOrder: "asc",
    },
  });

  return NextResponse.json(students);
}
