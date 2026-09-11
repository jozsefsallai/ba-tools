import { updateGameBannerSchema } from "@/lib/admin/game-banner-schemas";
import { serializeGameBanner } from "@/lib/admin/serialize-game-banner";
import { requireSuperUser } from "@/lib/auth/require-super-user";
import { db } from "@/lib/db";
import { invalidateGameBannersCache } from "@/lib/game-banners.server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  const { error } = await requireSuperUser();
  if (error) {
    return error;
  }

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateGameBannerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const existing = await db.gameBanner.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Banner not found" }, { status: 404 });
  }

  const data = parsed.data;
  const startDate = data.startDate
    ? new Date(data.startDate)
    : existing.startDate;
  const endDate = data.endDate ? new Date(data.endDate) : existing.endDate;

  if (endDate <= startDate) {
    return NextResponse.json(
      { error: "endDate must be after startDate" },
      { status: 400 },
    );
  }

  if (data.pickupStudentIds) {
    const students = await db.student.findMany({
      where: { id: { in: data.pickupStudentIds } },
    });

    if (students.length !== data.pickupStudentIds.length) {
      return NextResponse.json(
        { error: "One or more pickup students were not found" },
        { status: 400 },
      );
    }
  }

  const banner = await db.gameBanner.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.startDate !== undefined ? { startDate } : {}),
      ...(data.endDate !== undefined ? { endDate } : {}),
      ...(data.freePulls !== undefined ? { freePulls: data.freePulls } : {}),
      ...(data.isSelectablePickup !== undefined
        ? { isSelectablePickup: data.isSelectablePickup }
        : {}),
      ...(data.pickupStudentIds
        ? {
            pickupStudents: {
              set: data.pickupStudentIds.map((studentId) => ({
                id: studentId,
              })),
            },
          }
        : {}),
    },
    include: { pickupStudents: true },
  });

  invalidateGameBannersCache();
  return NextResponse.json(serializeGameBanner(banner));
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { error } = await requireSuperUser();
  if (error) {
    return error;
  }

  const { id } = await context.params;

  const existing = await db.gameBanner.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Banner not found" }, { status: 404 });
  }

  await db.gameBanner.delete({ where: { id } });

  invalidateGameBannersCache();
  return NextResponse.json({ ok: true });
}
