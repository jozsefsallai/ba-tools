import { offsetBannerDate } from "@/lib/admin/game-banner-dates";
import { offsetGameBannersSchema } from "@/lib/admin/game-banner-schemas";
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

  const parsed = offsetGameBannersSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { currentStartDate, offsetDays } = parsed.data;

  if (offsetDays === 0) {
    return NextResponse.json({
      ok: true,
      updatedCount: 0,
      banners: [],
    });
  }

  const currentStart = new Date(currentStartDate);

  const banners = await db.gameBanner.findMany({
    where: {
      startDate: {
        gte: currentStart,
      },
    },
    include: {
      pickupStudents: true,
    },
  });

  const updated = [];

  for (const banner of banners) {
    const newStartDate = offsetBannerDate(banner.startDate, offsetDays);
    const newEndDate = offsetBannerDate(banner.endDate, offsetDays);

    const next = await db.gameBanner.update({
      where: { id: banner.id },
      data: {
        startDate: newStartDate,
        endDate: newEndDate,
      },
      include: { pickupStudents: true },
    });

    updated.push(serializeGameBanner(next));
  }

  invalidateGameBannersCache();
  return NextResponse.json({
    ok: true,
    updatedCount: updated.length,
    banners: updated,
  });
}
