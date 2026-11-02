import { convexToZodShape } from "@/lib/mcp/convex-to-zod";
import { defineTool, idInput } from "@/lib/mcp/define-tool";
import {
  createRecruitmentAccount,
  createRecruitmentSession,
  deleteRecruitmentAccount,
  deleteRecruitmentSession,
  getRecruitmentAccount,
  getRecruitmentSession,
  listRecruitmentAccounts,
  listRecruitmentSessions,
  updateRecruitmentAccount,
  updateRecruitmentSession,
} from "@/lib/public-api/resources/recruitment.server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  recruitmentAccountArgs,
  recruitmentSessionArgs,
} from "~convex-lib/validators";

const accountFields = convexToZodShape(recruitmentAccountArgs);
const sessionFields = convexToZodShape(recruitmentSessionArgs);
const accountId = idInput("Recruitment account id.");
const sessionId = idInput("Recruitment session id.");

export function registerRecruitmentTools(server: McpServer) {
  defineTool(
    server,
    "list_recruitment_accounts",
    {
      title: "List my recruitment accounts",
      description:
        "The user's tracked recruitment (gacha) accounts, with pity charge and aggregate pull statistics.",
      kind: "read",
    },
    (_input, userId) => listRecruitmentAccounts(userId),
  );

  defineTool(
    server,
    "get_recruitment_account",
    {
      title: "Get recruitment account",
      description: "One recruitment account, with all of its sessions.",
      kind: "read",
      input: { accountId },
    },
    ({ accountId }, userId) => getRecruitmentAccount(userId, accountId),
  );

  defineTool(
    server,
    "create_recruitment_account",
    {
      title: "Create recruitment account",
      description:
        "Start tracking recruitment for a game account. The charges are the current permanent and limited pity counts.",
      kind: "create",
      input: accountFields,
    },
    (input, userId) => createRecruitmentAccount(userId, input),
  );

  defineTool(
    server,
    "update_recruitment_account",
    {
      title: "Update recruitment account",
      description: "Change a recruitment account. Only the fields sent change.",
      kind: "update",
      input: { accountId, ...z.object(accountFields).partial().shape },
    },
    ({ accountId, ...patch }, userId) =>
      updateRecruitmentAccount(userId, accountId, patch),
  );

  defineTool(
    server,
    "delete_recruitment_account",
    {
      title: "Delete recruitment account",
      description:
        "Permanently delete a recruitment account and all of its sessions.",
      kind: "delete",
      input: { accountId },
    },
    ({ accountId }, userId) => deleteRecruitmentAccount(userId, accountId),
  );

  defineTool(
    server,
    "list_recruitment_sessions",
    {
      title: "List recruitment sessions",
      description:
        "The pull sessions of a recruitment account, with computed statistics.",
      kind: "read",
      input: { accountId },
    },
    ({ accountId }, userId) => listRecruitmentSessions(userId, accountId),
  );

  defineTool(
    server,
    "get_recruitment_session",
    {
      title: "Get recruitment session",
      description: "One pull session, with computed statistics.",
      kind: "read",
      input: { accountId, sessionId },
    },
    ({ accountId, sessionId }, userId) =>
      getRecruitmentSession(userId, accountId, sessionId),
  );

  defineTool(
    server,
    "create_recruitment_session",
    {
      title: "Record recruitment session",
      description:
        "Record a pull session on a banner. `date` is a Unix timestamp in milliseconds. `pickupsObtained` lists each pickup student and the charge it came at.",
      kind: "create",
      input: { accountId, ...sessionFields },
    },
    ({ accountId, ...input }, userId) =>
      createRecruitmentSession(userId, accountId, input),
  );

  defineTool(
    server,
    "update_recruitment_session",
    {
      title: "Update recruitment session",
      description:
        "Change a pull session. Only the fields sent change; `pickupsObtained` replaces the whole list.",
      kind: "update",
      input: {
        accountId,
        sessionId,
        ...z.object(sessionFields).partial().shape,
      },
    },
    ({ accountId, sessionId, ...patch }, userId) =>
      updateRecruitmentSession(userId, accountId, sessionId, patch),
  );

  defineTool(
    server,
    "delete_recruitment_session",
    {
      title: "Delete recruitment session",
      description: "Permanently delete a pull session.",
      kind: "delete",
      input: { accountId, sessionId },
    },
    ({ accountId, sessionId }, userId) =>
      deleteRecruitmentSession(userId, accountId, sessionId),
  );
}
