import "server-only";

import type { PaginationOptions } from "convex/server";
import {
  type UserArgs,
  userMutation,
  userQuery,
} from "@/lib/public-api/convex.server";
import { withManualName } from "@/lib/public-api/resources/manual-name";
import { toPage, toResource } from "@/lib/public-api/serialize";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";

export async function listTimelineGroups(
  userId: string,
  paginationOpts: PaginationOptions,
) {
  return toPage(
    await userQuery(userId, api.timelineGroup.getOwnPaginated, {
      paginationOpts,
    }),
  );
}

export async function getTimelineGroup(userId: string, id: string) {
  return toResource(
    await userQuery(userId, api.timelineGroup.getOwnById, {
      id: id as Id<"timelineGroup">,
    }),
  );
}

export async function createTimelineGroup(
  userId: string,
  input: Record<string, unknown>,
) {
  const id = await userMutation(
    userId,
    api.timelineGroup.create,
    input as UserArgs<typeof api.timelineGroup.create>,
  );

  return await getTimelineGroup(userId, id);
}

export async function updateTimelineGroup(
  userId: string,
  id: string,
  patch: Record<string, unknown>,
) {
  await userMutation(userId, api.timelineGroup.update, {
    ...withManualName(patch),
    id: id as Id<"timelineGroup">,
  } as UserArgs<typeof api.timelineGroup.update>);

  return await getTimelineGroup(userId, id);
}

export async function deleteTimelineGroup(userId: string, id: string) {
  await userMutation(userId, api.timelineGroup.destroy, {
    id: id as Id<"timelineGroup">,
  });
}
