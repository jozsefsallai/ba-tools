import { makeOgImage } from "@/lib/og-image.server";
import { getCardContent } from "@/lib/og-metadata.server";
import { ToolOgCard } from "@/lib/og/card";
import { isOgCardKey } from "@/lib/og/registry";

export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; cardKey: string }> },
) {
  const { locale, cardKey } = await params;

  if ((locale !== "en" && locale !== "ja") || !isOgCardKey(cardKey)) {
    return new Response("Not found", { status: 404 });
  }

  const card = await getCardContent(cardKey, locale);
  const png = await makeOgImage(<ToolOgCard {...card} />);

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control":
        "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
