import { handleRoadmapRequest, parseBody } from "@/lib/roadmap/api.server";
import {
  createRoadmapItem,
  invalidateRoadmapCache,
} from "@/lib/roadmap/roadmap.server";
import { roadmapInputSchemas } from "@/lib/roadmap/schemas";
import type { EditableRoadmapKind } from "@/lib/roadmap/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ kind: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  const { kind } = await context.params;

  return handleRoadmapRequest(req, kind, async ({ body }) => {
    const roadmapKind = kind as EditableRoadmapKind;
    const input = parseBody(roadmapInputSchemas[roadmapKind], body);
    const item = await createRoadmapItem(roadmapKind, input);

    invalidateRoadmapCache();
    return NextResponse.json(item, { status: 201 });
  });
}
