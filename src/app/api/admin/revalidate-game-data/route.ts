import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireContentManager } from "@/lib/auth/require-role";
import { LAYOUT_GAME_DATA_CACHE_TAGS } from "@/lib/data/layout-cache";

export const runtime = "nodejs";

function backUrl(req: Request) {
  const origin = new URL(req.url).origin;
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const url = new URL(referer);
      if (url.origin === origin) {
        return url;
      }
    } catch {}
  }

  return new URL("/", origin);
}

export async function GET(req: Request) {
  const { error } = await requireContentManager();
  if (error) {
    return error;
  }

  for (const tag of LAYOUT_GAME_DATA_CACHE_TAGS) {
    revalidateTag(tag, {
      expire: 0,
    });
  }

  return NextResponse.redirect(backUrl(req), 303);
}
