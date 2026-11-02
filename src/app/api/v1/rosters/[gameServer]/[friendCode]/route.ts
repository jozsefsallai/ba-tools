import { getPublicRoster } from "@/lib/public-api/resources/shared-content.server";
import { ok } from "@/lib/public-api/response";
import { publicRoute } from "@/lib/public-api/route";

export const GET = publicRoute<{
  gameServer: string;
  friendCode: string;
}>(async (_req, { gameServer, friendCode }) => {
  return ok(await getPublicRoster(gameServer, friendCode), {
    cache: "shared",
  });
});
