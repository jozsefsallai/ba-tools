import { handleRoadmapRequest } from "@/lib/roadmap/api.server";
import { invalidateRoadmapCache } from "@/lib/roadmap/roadmap.server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return handleRoadmapRequest(req, null, async () => {
    invalidateRoadmapCache();
    return NextResponse.json({ ok: true });
  });
}
