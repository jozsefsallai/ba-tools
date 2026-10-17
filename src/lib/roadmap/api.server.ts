import "server-only";

import { requireSuperUser } from "@/lib/auth/require-super-user";
import { isEditableKind } from "@/lib/roadmap/constants";
import { RoadmapError } from "@/lib/roadmap/roadmap.server";
import type { EditableRoadmapKind } from "@/lib/roadmap/types";
import { NextResponse } from "next/server";
import type { z } from "zod";

type Handler = (ctx: {
  kind: EditableRoadmapKind | null;
  body: unknown;
}) => Promise<Response>;

export async function handleRoadmapRequest(
  req: Request,
  kindParam: string | null,
  handler: Handler,
): Promise<Response> {
  const { error } = await requireSuperUser();
  if (error) {
    return error;
  }

  if (kindParam !== null && !isEditableKind(kindParam)) {
    return NextResponse.json(
      { error: "Unknown roadmap kind" },
      { status: 404 },
    );
  }

  let body: unknown = null;
  if (req.method !== "DELETE") {
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  try {
    return await handler({
      kind: kindParam as EditableRoadmapKind | null,
      body,
    });
  } catch (err) {
    if (err instanceof RoadmapError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    throw err;
  }
}

export function parseBody<T extends z.ZodType>(
  schema: T,
  body: unknown,
): z.infer<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new RoadmapError(
      `Invalid payload: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ")}`,
    );
  }

  return parsed.data;
}
