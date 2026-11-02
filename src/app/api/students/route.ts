import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const students = await db.student.findMany({
    orderBy: {
      defaultOrder: "asc",
    },
  });

  return NextResponse.json(students);
}
