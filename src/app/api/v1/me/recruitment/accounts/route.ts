import {
  createRecruitmentAccount,
  listRecruitmentAccounts,
} from "@/lib/public-api/resources/recruitment.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";

export const GET = userRoute(async (_req, _params, userId) => {
  return ok(await listRecruitmentAccounts(userId), { cache: "private" });
});

export const POST = userRoute(async (req, _params, userId) => {
  return ok(await createRecruitmentAccount(userId, await readJsonObject(req)), {
    cache: "private",
    status: 201,
  });
});
