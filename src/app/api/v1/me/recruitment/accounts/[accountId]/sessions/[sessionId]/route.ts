import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import { ok } from "@/lib/public-api/response";
import {
  mergeForUpdate,
  notFound,
  readJsonObject,
  userRoute,
} from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

type Params = { accountId: string; sessionId: string };

const UPDATE_KEYS = [
  "name",
  "date",
  "isFestBanner",
  "permanentStartCharge",
  "limitedStartCharge",
  "permanentPulls",
  "limitedPulls",
  "pickupsObtained",
  "threeStarCount",
  "rebateTicketsUsed",
] as const;

async function getSession(userId: string, { accountId, sessionId }: Params) {
  const session = await userQuery(userId, api.recruitment.getSession, {
    sessionId: sessionId as Id<"recruitmentSession">,
  });

  if (!session || session.recruitmentAccountId !== accountId) {
    throw notFound("Recruitment session not found.");
  }

  return session;
}

export const GET = userRoute<Params>(async (_req, params, userId) => {
  return ok(toResource(await getSession(userId, params)), {
    cache: "private",
  });
});

export const PATCH = userRoute<Params>(async (req, params, userId) => {
  const body = await readJsonObject(req);

  const current = await getSession(userId, params);

  await userMutation(userId, api.recruitment.updateSession, {
    ...mergeForUpdate(current, UPDATE_KEYS, body),
    sessionId: current._id,
  } as UserArgs<typeof api.recruitment.updateSession>);

  return ok(toResource(await getSession(userId, params)), {
    cache: "private",
  });
});

export const DELETE = userRoute<Params>(async (_req, params, userId) => {
  const session = await getSession(userId, params);

  await userMutation(userId, api.recruitment.deleteSession, {
    sessionId: session._id,
  });

  return new Response(null, { status: 204 });
});
