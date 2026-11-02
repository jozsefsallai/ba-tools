import "server-only";

import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import { mergeForUpdate, notFound } from "@/lib/public-api/route";
import { toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

const ACCOUNT_UPDATE_KEYS = [
  "name",
  "gameServer",
  "permanentCharge",
  "limitedCharge",
] as const;

const SESSION_UPDATE_KEYS = [
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

async function findAccount(userId: string, accountId: string) {
  return await userQuery(userId, api.recruitment.getAccount, {
    accountId: accountId as Id<"recruitmentAccount">,
  });
}

async function findSession(
  userId: string,
  accountId: string,
  sessionId: string,
) {
  const session = await userQuery(userId, api.recruitment.getSession, {
    sessionId: sessionId as Id<"recruitmentSession">,
  });

  if (!session || session.recruitmentAccountId !== accountId) {
    throw notFound("Recruitment session not found.");
  }

  return session;
}

export async function listRecruitmentAccounts(userId: string) {
  return toResource(
    await userQuery(userId, api.recruitment.getOwnAccounts, {}),
  );
}

export async function getRecruitmentAccount(userId: string, accountId: string) {
  const { account, sessions } = await findAccount(userId, accountId);
  return toResource({ ...account, sessions });
}

export async function createRecruitmentAccount(
  userId: string,
  input: Record<string, unknown>,
) {
  const accountId = await userMutation(
    userId,
    api.recruitment.createAccount,
    input as UserArgs<typeof api.recruitment.createAccount>,
  );

  return await getRecruitmentAccount(userId, accountId);
}

export async function updateRecruitmentAccount(
  userId: string,
  accountId: string,
  patch: Record<string, unknown>,
) {
  const { account: current } = await findAccount(userId, accountId);

  await userMutation(userId, api.recruitment.updateAccount, {
    ...mergeForUpdate(current, ACCOUNT_UPDATE_KEYS, patch),
    accountId: current._id,
  } as UserArgs<typeof api.recruitment.updateAccount>);

  return await getRecruitmentAccount(userId, accountId);
}

export async function deleteRecruitmentAccount(
  userId: string,
  accountId: string,
) {
  await userMutation(userId, api.recruitment.deleteAccount, {
    accountId: accountId as Id<"recruitmentAccount">,
  });
}

export async function listRecruitmentSessions(
  userId: string,
  accountId: string,
) {
  const { sessions } = await findAccount(userId, accountId);
  return toResource(sessions);
}

export async function getRecruitmentSession(
  userId: string,
  accountId: string,
  sessionId: string,
) {
  return toResource(await findSession(userId, accountId, sessionId));
}

export async function createRecruitmentSession(
  userId: string,
  accountId: string,
  input: Record<string, unknown>,
) {
  const sessionId = await userMutation(userId, api.recruitment.createSession, {
    ...input,
    recruitmentAccountId: accountId as Id<"recruitmentAccount">,
  } as UserArgs<typeof api.recruitment.createSession>);

  return toResource(
    await userQuery(userId, api.recruitment.getSession, { sessionId }),
  );
}

export async function updateRecruitmentSession(
  userId: string,
  accountId: string,
  sessionId: string,
  patch: Record<string, unknown>,
) {
  const current = await findSession(userId, accountId, sessionId);

  await userMutation(userId, api.recruitment.updateSession, {
    ...mergeForUpdate(current, SESSION_UPDATE_KEYS, patch),
    sessionId: current._id,
  } as UserArgs<typeof api.recruitment.updateSession>);

  return await getRecruitmentSession(userId, accountId, sessionId);
}

export async function deleteRecruitmentSession(
  userId: string,
  accountId: string,
  sessionId: string,
) {
  const session = await findSession(userId, accountId, sessionId);

  await userMutation(userId, api.recruitment.deleteSession, {
    sessionId: session._id,
  });
}
