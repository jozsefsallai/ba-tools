import { getMission } from "@/lib/data/missions.server";
import { parseMissionLabel } from "@/lib/missions/labels";
import { missionBoardImage } from "@/lib/og/mission-board.server";

export const runtime = "nodejs";
export const revalidate = 86_400;

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      mission: string;
    }>;
  },
) {
  const where = parseMissionLabel(decodeURIComponent((await params).mission));
  const mission = where ? await getMission(where) : null;

  if (!mission) {
    return new Response("Not found", {
      status: 404,
    });
  }

  const { png } = await missionBoardImage({
    map: mission.map,
    solutions: mission.solutions,
  });

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control":
        "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
