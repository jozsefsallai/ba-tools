import { handleRoadmapRequest, parseBody } from "@/lib/roadmap/api.server";
import { isEditableKind } from "@/lib/roadmap/constants";
import {
  RoadmapError,
  invalidateRoadmapCache,
  offsetRoadmapItems,
} from "@/lib/roadmap/roadmap.server";
import { offsetRoadmapSchema } from "@/lib/roadmap/schemas";
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = offsetRoadmapSchema.extend({ kind: z.string() });

export async function POST(req: Request) {
  return handleRoadmapRequest(req, null, async ({ body }) => {
    const { kind, ids, offsetMs } = parseBody(bodySchema, body);

    if (!isEditableKind(kind)) {
      throw new RoadmapError("Unknown roadmap kind", 404);
    }

    const items = await offsetRoadmapItems(kind, ids, offsetMs);

    invalidateRoadmapCache();
    return NextResponse.json({ updatedCount: items.length, items });
  });
}
