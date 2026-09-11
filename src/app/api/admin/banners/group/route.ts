import { updateGameBannerGroupSchema } from "@/lib/admin/game-banner-schemas";
import { requireSuperUser } from "@/lib/auth/require-super-user";
import { db } from "@/lib/db";
import { invalidateGameBannersCache } from "@/lib/game-banners.server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function PATCH(req: Request) {
  const { error } = await requireSuperUser();
  if (error) {
    return error;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateGameBannerGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { oldStartDate, oldEndDate, newStartDate, newEndDate } = parsed.data;
  const oldStart = new Date(oldStartDate);
  const oldEnd = new Date(oldEndDate);
  const newStart = new Date(newStartDate);
  const newEnd = new Date(newEndDate);

  if (newEnd <= newStart) {
    return NextResponse.json(
      { error: "endDate must be after startDate" },
      { status: 400 },
    );
  }

  const result = await db.gameBanner.updateMany({
    where: {
      startDate: oldStart,
      endDate: oldEnd,
    },
    data: {
      startDate: newStart,
      endDate: newEnd,
    },
  });

  invalidateGameBannersCache();
  return NextResponse.json({
    ok: true,
    updatedCount: result.count,
    startDate: newStart.toISOString(),
    endDate: newEnd.toISOString(),
  });
}
