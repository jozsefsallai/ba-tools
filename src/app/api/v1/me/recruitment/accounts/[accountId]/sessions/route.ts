import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import { ok } from "@/lib/public-api/response";
import { readJsonObject, userRoute } from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

type Params = { accountId: string };

export const GET = userRoute<Params>(async (_req, { accountId }, userId) => {
  const { sessions } = await userQuery(userId, api.recruitment.getAccount, {
    accountId: accountId as Id<"recruitmentAccount">,
  });

  return ok(toResource(sessions), { cache: "private" });
});

export const POST = userRoute<Params>(async (req, { accountId }, userId) => {
  const body = await readJsonObject(req);

  const sessionId = await userMutation(userId, api.recruitment.createSession, {
    ...body,
    recruitmentAccountId: accountId as Id<"recruitmentAccount">,
  } as UserArgs<typeof api.recruitment.createSession>);

  const session = await userQuery(userId, api.recruitment.getSession, {
    sessionId,
  });

  return ok(toResource(session), { cache: "private", status: 201 });
});
