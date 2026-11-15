import { NextResponse } from "next/server";
import { requireContentManager } from "@/lib/auth/require-role";
import { fetchRoadmapItems } from "@/lib/roadmap/roadmap.server";

export const runtime = "nodejs";

// The roadmap from a past date on, for the editor to look back
export async function GET(req: Request) {
  const { error } = await requireContentManager();
  if (error) {
    return error;
  }

  const from = new Date(new URL(req.url).searchParams.get("from") ?? "");

  if (Number.isNaN(from.getTime())) {
    return NextResponse.json(
      {
        error: "Expected a date",
      },
      {
        status: 400,
      },
    );
  }

  return NextResponse.json(await fetchRoadmapItems(from));
}
