import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";

export const GET = userRoute(async (_req, _params, userId) => {
  return ok(
    toResource(await userQuery(userId, api.recruitment.getOwnAccounts, {})),
    { cache: "private" },
  );
});

export const POST = userRoute(async (req, _params, userId) => {
  const body = await readJsonObject(req);

  const accountId = await userMutation(
    userId,
    api.recruitment.createAccount,
    body as UserArgs<typeof api.recruitment.createAccount>,
  );

  const { account, sessions } = await userQuery(
    userId,
    api.recruitment.getAccount,
    { accountId },
  );

  return ok(toResource({ ...account, sessions }), {
    cache: "private",
    status: 201,
  });
});
