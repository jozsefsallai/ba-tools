import { createGameBannerSchema } from "@/lib/admin/game-banner-schemas";
import { serializeGameBanner } from "@/lib/admin/serialize-game-banner";
import { requireSuperUser } from "@/lib/auth/require-super-user";
import { db } from "@/lib/db";
import { invalidateGameBannersCache } from "@/lib/game-banners.server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
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

  const parsed = createGameBannerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  if (endDate <= startDate) {
    return NextResponse.json(
      { error: "endDate must be after startDate" },
      { status: 400 },
    );
  }

  const students = await db.student.findMany({
    where: { id: { in: data.pickupStudentIds } },
  });

  if (students.length !== data.pickupStudentIds.length) {
    return NextResponse.json(
      { error: "One or more pickup students were not found" },
      { status: 400 },
    );
  }

  const banner = await db.gameBanner.create({
    data: {
      name: data.name ?? null,
      startDate,
      endDate,
      freePulls: data.freePulls,
      isSelectablePickup: data.isSelectablePickup,
      pickupStudents: {
        connect: data.pickupStudentIds.map((id) => ({ id })),
      },
    },
    include: { pickupStudents: true },
  });

  invalidateGameBannersCache();
  return NextResponse.json(serializeGameBanner(banner), { status: 201 });
}
