import { NextResponse } from "next/server";
import { handleRoadmapRequest } from "@/lib/roadmap/api.server";
import { invalidateRoadmapCache } from "@/lib/roadmap/roadmap.server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return handleRoadmapRequest(req, null, async () => {
    invalidateRoadmapCache();
    return NextResponse.json({
      ok: true,
    });
  });
}
