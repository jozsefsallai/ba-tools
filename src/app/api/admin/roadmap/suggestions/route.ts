import { NextResponse } from "next/server";
import { requireContentManager } from "@/lib/auth/require-role";
import { isEditableKind } from "@/lib/roadmap/constants";
import { getRoadmapSuggestions } from "@/lib/roadmap/suggestions.server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { error } = await requireContentManager();
  if (error) {
    return error;
  }

  const params = new URL(req.url).searchParams;
  const kind = params.get("kind") ?? "";
  // where an item without a date in the game files goes
  const date = new Date(params.get("date") ?? "");

  if (!isEditableKind(kind) || Number.isNaN(date.getTime())) {
    return NextResponse.json(
      {
        error: "Expected a roadmap kind and a date",
      },
      {
        status: 400,
      },
    );
  }

  return NextResponse.json(
    await getRoadmapSuggestions(kind, date.toISOString()),
  );
}
