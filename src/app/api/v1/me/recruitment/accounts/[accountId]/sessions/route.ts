import {
  createRecruitmentSession,
  listRecruitmentSessions,
} from "@/lib/public-api/resources/recruitment.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";

type Params = { accountId: string };

export const GET = userRoute<Params>(async (_req, { accountId }, userId) => {
  return ok(await listRecruitmentSessions(userId, accountId), {
    cache: "private",
  });
});

export const POST = userRoute<Params>(async (req, { accountId }, userId) => {
  return ok(
    await createRecruitmentSession(
      userId,
      accountId,
      await readJsonObject(req),
    ),
    {
      cache: "private",
      status: 201,
    },
  );
});
