import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import { ok } from "@/lib/public-api/response";
import {
  mergeForUpdate,
  readJsonObject,
  userRoute,
} from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

type Params = { accountId: string };

const UPDATE_KEYS = [
  "name",
  "gameServer",
  "permanentCharge",
  "limitedCharge",
] as const;

async function getAccount(userId: string, accountId: string) {
  return await userQuery(userId, api.recruitment.getAccount, {
    accountId: accountId as Id<"recruitmentAccount">,
  });
}

export const GET = userRoute<Params>(async (_req, { accountId }, userId) => {
  const { account, sessions } = await getAccount(userId, accountId);
  return ok(toResource({ ...account, sessions }), { cache: "private" });
});

export const PATCH = userRoute<Params>(async (req, { accountId }, userId) => {
  const body = await readJsonObject(req);

  const { account: current } = await getAccount(userId, accountId);

  await userMutation(userId, api.recruitment.updateAccount, {
    ...mergeForUpdate(current, UPDATE_KEYS, body),
    accountId: current._id,
  } as UserArgs<typeof api.recruitment.updateAccount>);

  const { account, sessions } = await getAccount(userId, accountId);

  return ok(toResource({ ...account, sessions }), { cache: "private" });
});

export const DELETE = userRoute<Params>(async (_req, { accountId }, userId) => {
  await userMutation(userId, api.recruitment.deleteAccount, {
    accountId: accountId as Id<"recruitmentAccount">,
  });

  return new Response(null, { status: 204 });
});
