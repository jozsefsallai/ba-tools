import {
  deleteRecruitmentAccount,
  getRecruitmentAccount,
  updateRecruitmentAccount,
} from "@/lib/public-api/resources/recruitment.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";

type Params = { accountId: string };

export const GET = userRoute<Params>(async (_req, { accountId }, userId) => {
  return ok(await getRecruitmentAccount(userId, accountId), {
    cache: "private",
  });
});

export const PATCH = userRoute<Params>(async (req, { accountId }, userId) => {
  return ok(
    await updateRecruitmentAccount(
      userId,
      accountId,
      await readJsonObject(req),
    ),
    {
      cache: "private",
    },
  );
});

export const DELETE = userRoute<Params>(async (_req, { accountId }, userId) => {
  await deleteRecruitmentAccount(userId, accountId);
  return new Response(null, { status: 204 });
});
