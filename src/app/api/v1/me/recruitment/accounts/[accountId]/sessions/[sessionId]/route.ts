import {
  deleteRecruitmentSession,
  getRecruitmentSession,
  updateRecruitmentSession,
} from "@/lib/public-api/resources/recruitment.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";

type Params = { accountId: string; sessionId: string };

export const GET = userRoute<Params>(
  async (_req, { accountId, sessionId }, userId) => {
    return ok(await getRecruitmentSession(userId, accountId, sessionId), {
      cache: "private",
    });
  },
);

export const PATCH = userRoute<Params>(
  async (req, { accountId, sessionId }, userId) => {
    return ok(
      await updateRecruitmentSession(
        userId,
        accountId,
        sessionId,
        await readJsonObject(req),
      ),
      {
        cache: "private",
      },
    );
  },
);

export const DELETE = userRoute<Params>(
  async (_req, { accountId, sessionId }, userId) => {
    await deleteRecruitmentSession(userId, accountId, sessionId);
    return new Response(null, { status: 204 });
  },
);
