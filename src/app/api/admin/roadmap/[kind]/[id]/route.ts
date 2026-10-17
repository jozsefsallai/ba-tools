import { handleRoadmapRequest, parseBody } from "@/lib/roadmap/api.server";
import {
  deleteRoadmapItem,
  invalidateRoadmapCache,
  updateRoadmapItem,
} from "@/lib/roadmap/roadmap.server";
import { roadmapInputSchemas } from "@/lib/roadmap/schemas";
import type { EditableRoadmapKind } from "@/lib/roadmap/types";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ kind: string; id: string }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  const { kind, id } = await context.params;

  return handleRoadmapRequest(req, kind, async ({ body }) => {
    const roadmapKind = kind as EditableRoadmapKind;
    const input = parseBody(roadmapInputSchemas[roadmapKind].partial(), body);
    const item = await updateRoadmapItem(roadmapKind, id, input);

    invalidateRoadmapCache();
    return NextResponse.json(item);
  });
}

export async function DELETE(req: Request, context: RouteContext) {
  const { kind, id } = await context.params;

  return handleRoadmapRequest(req, kind, async () => {
    await deleteRoadmapItem(kind as EditableRoadmapKind, id);

    invalidateRoadmapCache();
    return NextResponse.json({ ok: true });
  });
}
